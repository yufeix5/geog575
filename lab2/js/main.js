(function () {
// global variables for coordinated views
    var attrArray = [
        "median_rent",
        "median_income",
        "rent_income_ratio",
        "food_density",
        "park_area_ratio",
        "avg_commute_time"
    ];
    // use different color schemes for different attributes
    var attributeMeta = {
        median_rent: {
            label: "Median Rent (USD/month)",
            colors: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"]
        },
        median_income: {
            label: "Median Income (USD/year)",
            colors: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"]
        },
        rent_income_ratio: {
            label: "Rent Income Ratio (%)",
            colors: ["#fff5f0", "#fcbba1", "#fc9272", "#fb6a4a", "#cb181d"]
        },
        food_density: {
            label: "Food Density (stores/km²)",
            colors: ["#f7fcf5", "#c7e9c0", "#74c476", "#31a354", "#006d2c"]
        },
        park_area_ratio: {
            label: "Park Area Ratio (%)",
            colors: ["#f7fcfd", "#ccece6", "#66c2a4", "#2ca25f", "#006d2c"]
        },
        avg_commute_time: {
            label: "Avg Commute Time (min)",
            colors: ["#fff5eb", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]
        }
    };

    // Initial expressed attribute
    var expressed = "rent_income_ratio";
    var activeSearchId = null;

    // window onload to initialize
    window.onload = function () {
        initializeApp();
    };

    // Initialize all top-level UI components for the page
    function initializeApp() {
        setMap();
        setTabs();
    }

    // set map and coordinated chart
    function setMap() {
        // Select existing visualization wrapper or create one as a fallback.
        var vizWrap = d3.select("#viz-wrap");
        if (vizWrap.empty()) {
            vizWrap = d3.select("body")
                .append("div")
                .attr("id", "viz-wrap");
        }

        // responsive layout based on wrapper width
        var wrapWidth = vizWrap.node().clientWidth || (window.innerWidth - 40);
        var isNarrow = wrapWidth < 1024;

        // Map frame dimensions
        var mapWidth = isNarrow ? Math.max(320, Math.floor(wrapWidth)) : Math.floor(wrapWidth * 0.62);
        var mapHeight = isNarrow ? 420 : 500;

        // Create map SVG container
        var map = vizWrap
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight)
            .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight)
            .attr("preserveAspectRatio", "xMinYMin meet");

        // UI controls container
        var controls = vizWrap
            .append("div")
            .attr("class", "controls");

        // Dropdown for attribute switching
        var dropdown = controls.append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData);
            });

        // Group search input and buttons in one control row
        var searchWrap = controls.append("div")
            .attr("class", "search-wrap");

        // search input with datalist autocomplete for community district names
        var searchInput = searchWrap.append("input")
            .attr("class", "search-input")
            .attr("type", "search")
            .attr("placeholder", "Search CD name")
            .attr("list", "cd-name-list")
            .on("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch(searchInput.property("value"), csvData, status);
                }
            });

        // lookup button for search query
        var searchButton = searchWrap.append("button")
            .attr("class", "search-button")
            .attr("type", "button")
            .text("Locate")
            .on("click", function () {
                runSearch(searchInput.property("value"), csvData, status);
            });

        // clear button to reset search and remove highlight
        var clearButton = searchWrap.append("button")
            .attr("class", "search-clear")
            .attr("type", "button")
            .text("Clear")
            .on("click", function () {
                searchInput.property("value", "");
                clearSearchSelection();
                status.text("");
            });

        // datalist element for search autocomplete options
        searchWrap.append("datalist")
            .attr("id", "cd-name-list");

        // status message for search results
        var status = controls.append("div")
            .attr("class", "search-status");

        // dropdown options
        attrArray.forEach(function (attr) {
            dropdown.append("option")
                .attr("value", attr)
                .text(formatAttributeName(attr));
        });

        // initialize dropdown to expressed attribute
        dropdown.property("value", expressed);

        // csvData is loaded in the Promise.all callback and assigned to this variable for access in event handlers
        var csvData;

        // load data and render map + chart after all resources are ready
        Promise.all([
            d3.json("data/cd_final_topo.json"),
            d3.csv("data/cd_attributes.csv"),
            import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm")
        ]).then(function (data) {
            // Unpack loaded resources
            var topology = data[0];
            csvData = data[1];
            var topojsonClient = data[2];

            // Convert numeric fields from strings
            csvData.forEach(function (d) {
                d.BoroCD = +d.BoroCD;
                attrArray.forEach(function (attr) {
                    d[attr] = parseFloat(d[attr]);
                });
            });

            // Populate autocomplete list after CSV rows are parsed.
            populateSearchList(csvData);

            // Convert TopoJSON to GeoJSON features
            var geojson = topojsonClient.feature(topology, topology.objects.cd_final_topo).features;

            // Join CSV attributes to GeoJSON features
            joinData(geojson, csvData);

            // Projection fitted with a small top inset so the map sits slightly lower.
            var projection = d3.geoMercator()
                .fitExtent([[10, 20], [mapWidth - 10, mapHeight - 40]], {
                    type: "FeatureCollection",
                    features: geojson
                });

            // path generator using the projection
            var path = d3.geoPath().projection(projection);

            // Build color scale
            var colorScale = makeColorScale(csvData);

            // Draw map and coordinated chart
            // both functions use csvData and colorScale, so they are called after those are set up
            setEnumerationUnits(geojson, map, path, colorScale);
            setChart(csvData, colorScale, vizWrap, isNarrow, wrapWidth, mapHeight);

            // Map title
            map.append("text")
                .attr("class", "map-title")
                .attr("x", 16)
                .attr("y", 26)
                .text("NYC Community Districts");
        }).catch(function (error) {
            console.error("Activity 10 load error:", error);
        });
    }

    // Copy CSV attributes into matching GeoJSON feature properties by BoroCD.
    function joinData(geojsonFeatures, csvData) {
        // Nested-loop join by BoroCD
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i];
            var csvKey = csvRegion.BoroCD;

            for (var a = 0; a < geojsonFeatures.length; a++) {
                var geojsonProps = geojsonFeatures[a].properties;
                var geojsonKey = +geojsonProps.BoroCD;

                if (geojsonKey === csvKey) {
                    // Copy all thematic attributes
                    attrArray.forEach(function (attr) {
                        geojsonProps[attr] = parseFloat(csvRegion[attr]);
                    });

                    // Copy district label
                    geojsonProps.Location = csvRegion.Location;
                }
            }
        }
    }

    // build color scale generator based on csv data for the currently expressed attribute
    function makeColorScale(csvData) {
        // quantile scale with color classes from metadata and values from the current attribute
        var colorClasses = getColorClasses(expressed);
        var values = csvData
            .map(function (d) { return Number(d[expressed]); })
            .filter(function (v) { return Number.isFinite(v); });

        return d3.scaleQuantile()
            .range(colorClasses)
            .domain(values);
    }

    // Return feature fill color or a neutral fallback for missing values.
    function choropleth(props, colorScale) {
        // Return fill based on current attribute
        var val = parseFloat(props[expressed]);
        if (Number.isFinite(val)) {
            return colorScale(val);
        }

        // Fallback for missing data
        return "#dddddd";
    }

    // Draw district polygons and attach retrieve interactions
    function setEnumerationUnits(geojsonFeatures, map, path, colorScale) {
        // Draw district polygons
        var districts = map.selectAll(".district")
            .data(geojsonFeatures)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "district boro" + d.properties.BoroCD;
            })
            .attr("d", path)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function (event, d) {
                highlight(d);
                setLabel(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
                d3.select(".infolabel").remove();
            })
            .on("mousemove", moveLabel);

        // Store baseline stroke styles so they can be restored after hover
        districts
            .append("desc")
            .text('{"stroke":"#94a3b8","stroke-width":"0.9"}');

        // Tooltip per district
        districts.append("title")
            .text(function (d) {
                var value = Number(d.properties[expressed]);
                var valueText = formatValue(expressed, value, false);
                return d.properties.Location + "\n" + formatAttributeName(expressed) + ": " + valueText;
            });
    }

    // Draw coordinated bar chart that mirrors the map's current attribute
    function setChart(csvData, colorScale, vizWrap, isNarrow, wrapWidth, mapHeight) {
        // Chart frame dimensions
        var chartWidth = isNarrow ? Math.max(320, Math.floor(wrapWidth)) : Math.floor(wrapWidth * 0.36);
        var chartHeight = mapHeight - 6;
        var topPadding = 56;
        var bottomPadding = 28;
        var leftPadding = 52;
        var rightPadding = 6;
        var plotWidth = chartWidth - leftPadding - rightPadding;
        var barInset = 1;

        // Create chart SVG container
        var chart = vizWrap
            .append("svg")
            .attr("class", "chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("viewBox", "0 0 " + chartWidth + " " + chartHeight)
            .attr("preserveAspectRatio", "xMinYMin meet");

        // Scale for bar heights
        var yScale = d3.scaleLinear()
            .range([chartHeight - bottomPadding, topPadding])
            .domain([0, d3.max(csvData, function (d) { return d[expressed]; })]);

        // Left-side axis improves readability when many bars are present.
        var yAxis = d3.axisLeft(yScale)
            .ticks(6)
            .tickFormat(function (d) {
                return formatAxisTick(expressed, d);
            });

        chart.append("g")
            .attr("class", "chart-axis y-axis")
            .attr("transform", "translate(" + leftPadding + ",0)")
            .call(yAxis);

        // Draw sorted bars
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return a[expressed] - b[expressed];
            })
            .attr("class", function (d) {
                return "bars boro" + d.BoroCD;
            })
            .attr("width", plotWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return leftPadding + barInset + i * (plotWidth / csvData.length);
            })
            .attr("height", function (d) {
                return (chartHeight - bottomPadding) - yScale(d[expressed]);
            })
            .attr("y", function (d) {
                return yScale(d[expressed]);
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            })
            .on("mouseover", function (event, d) {
                highlight(d);
                setLabel(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d);
                d3.select(".infolabel").remove();
            })
            .on("mousemove", moveLabel);

        // Store baseline bar stroke styles for coordinated dehighlight
        bars
            .append("desc")
            .text('{"stroke":"#ffffff","stroke-width":"0.6"}');

        // Tooltip per bar
        bars.append("title")
            .text(function (d) {
                var value = Number(d[expressed]);
                var valueText = formatValue(expressed, value, false);
                return d.Location + "\n" + formatAttributeName(expressed) + ": " + valueText;
            });

        // Dynamic chart title
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", 14)
            .attr("y", 28)
            .text(formatAttributeName(expressed) + " by Community District");
    }

    // Recompute colors and values in both views after dropdown selection changes
    function changeAttribute(attribute, csvData) {
        // Re-express map + chart to selected attribute
        expressed = attribute;
        var colorScale = makeColorScale(csvData);

        // Update map colors and map tooltips
        d3.selectAll(".district")
            .transition()
            .duration(500)
            .style("fill", function (d) {
                return choropleth(d.properties, colorScale);
            })
            .select("title")
            .text(function (d) {
                var value = Number(d.properties[expressed]);
                var valueText = formatValue(expressed, value, false);
                return d.properties.Location + "\n" + formatAttributeName(expressed) + ": " + valueText;
            });

        // Resort and animate bars
        var bars = d3.selectAll(".bars")
            .sort(function (a, b) {
                return a[expressed] - b[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 5;
            })
            .duration(500);

        // Update bar geometry and color
        updateChart(bars, csvData.length, colorScale);

        // Update side axis to reflect new attribute scale and units.
        var chartHeight = parseFloat(d3.select(".chart").attr("height"));
        var topPadding = 56;
        var bottomPadding = 28;
        var yScale = d3.scaleLinear()
            .range([chartHeight - bottomPadding, topPadding])
            .domain([0, d3.max(csvData, function (row) { return row[expressed]; })]);

        var yAxis = d3.axisLeft(yScale)
            .ticks(6)
            .tickFormat(function (d) {
                return formatAxisTick(expressed, d);
            });

        d3.select(".y-axis")
            .transition()
            .duration(500)
            .call(yAxis);

        // Update bar tooltips + title
        d3.selectAll(".bars title")
            .text(function (d) {
                var value = Number(d[expressed]);
                var valueText = formatValue(expressed, value, false);
                return d.Location + "\n" + formatAttributeName(expressed) + ": " + valueText;
            });

        d3.select(".chartTitle")
            .text(formatAttributeName(expressed) + " by Community District");
    }

    // Update bar x/y geometry and fill after data resorting
    function updateChart(bars, n, colorScale) {
        // Read current chart frame size
        var chartWidth = parseFloat(d3.select(".chart").attr("width"));
        var chartHeight = parseFloat(d3.select(".chart").attr("height"));
        var topPadding = 56;
        var bottomPadding = 28;
        var leftPadding = 52;
        var rightPadding = 6;
        var plotWidth = chartWidth - leftPadding - rightPadding;
        var barInset = 1;

        // Scale with current expressed max
        var yScale = d3.scaleLinear()
            .range([chartHeight - bottomPadding, topPadding])
            .domain([0, d3.max(d3.selectAll(".bars").data(), function (d) {
                return d[expressed];
            })]);

        // Update bar positions/sizes/colors
        bars
            .attr("x", function (d, i) {
                return leftPadding + barInset + i * (plotWidth / n);
            })
            .attr("width", plotWidth / n - 1)
            .attr("height", function (d) {
                return (chartHeight - bottomPadding) - yScale(d[expressed]);
            })
            .attr("y", function (d) {
                return yScale(d[expressed]);
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });
    }

    // Resolve display label from metadata, then fallback to snake_case conversion
    function formatAttributeName(attr) {
        var meta = attributeMeta[attr];
        return meta ? meta.label : attr.replace(/_/g, " ");
    }

    // Resolve per-attribute color palette, with a default fallback ramp
    function getColorClasses(attr) {
        var meta = attributeMeta[attr];
        return meta && Array.isArray(meta.colors)
            ? meta.colors
            : ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"];
    }

    // Apply attribute-specific units and numeric formatting rules
    function formatValue(attr, value, compact) {
        if (!Number.isFinite(value)) {
            return "No data";
        }

        if (attr === "median_rent") {
            return compact ? d3.format("$.2s")(value) : d3.format("$,.0f")(value);
        }

        if (attr === "median_income") {
            return compact ? d3.format("$.2s")(value) : d3.format("$,.0f")(value);
        }

        if (attr === "avg_commute_time") {
            return compact ? d3.format(".2~f")(value) + "m" : d3.format(".2f")(value) + " min";
        }

        if (attr === "rent_income_ratio" || attr === "park_area_ratio") {
            return d3.format(compact ? ".2~f" : ".2f")(value) + "%";
        }

        if (attr === "food_density") {
            return compact ? d3.format(".2~f")(value) : d3.format(".2f")(value) + " stores/km²";
        }

        return d3.format(compact ? ".2~f" : ".2f")(value);
    }

    // Format y-axis ticks with units while keeping labels compact.
    function formatAxisTick(attr, value) {
        return formatValue(attr, Number(value), true);
    }

    // Fill datalist options with unique sorted community district names
    function populateSearchList(csvData) {
        var datalist = d3.select("#cd-name-list");
        if (datalist.empty()) {
            return;
        }

        var names = Array.from(new Set(csvData
            .map(function (d) { return d.Location; })
            .filter(function (name) { return !!name; })))
            .sort(d3.ascending);

        datalist.selectAll("option")
            .data(names)
            .enter()
            .append("option")
            .attr("value", function (d) { return d; });
    }

    // Clear any persistent highlight introduced by search
    function clearSearchSelection() {
        if (activeSearchId === null) {
            d3.select(".infolabel").remove();
            return;
        }

        dehighlight({ BoroCD: activeSearchId });
        activeSearchId = null;
        d3.select(".infolabel").remove();
    }

    // Search by district name (exact first, then partial) and highlight result
    function runSearch(query, csvData, status) {
        if (!csvData || !Array.isArray(csvData)) {
            return;
        }

        var normalized = (query || "").trim().toLowerCase();
        clearSearchSelection();

        if (normalized.length === 0) {
            status.text("Type a community district name to search.");
            return;
        }

        var exact = csvData.find(function (d) {
            return d.Location && d.Location.toLowerCase() === normalized;
        });

        var match = exact || csvData.find(function (d) {
            return d.Location && d.Location.toLowerCase().indexOf(normalized) !== -1;
        });

        if (!match) {
            status.text("No match found.");
            return;
        }

        activeSearchId = match.BoroCD;
        highlight(match);
        status.text("Found: " + (match.Location || ("BoroCD " + match.BoroCD)));
    }

    // Normalize map feature and CSV row objects to one property access shape
    function getProps(d) {
        return d.properties ? d.properties : d;
    }

    // Apply coordinated highlight to both map polygon and matching chart bar
    function highlight(d) {
        var props = getProps(d);
        d3.selectAll(".district.boro" + props.BoroCD + ", .bars.boro" + props.BoroCD)
            .style("stroke", "#111827")
            .style("stroke-width", 2);
    }

    // Restore original stroke styles for both linked visual elements
    function dehighlight(d) {
        var props = getProps(d);
        var selected = d3.selectAll(".district.boro" + props.BoroCD + ", .bars.boro" + props.BoroCD);

        selected.each(function () {
            var styleText = d3.select(this).select("desc").text();
            var styleObject = JSON.parse(styleText);
            d3.select(this)
                .style("stroke", styleObject.stroke)
                .style("stroke-width", styleObject["stroke-width"]);
        });
    }

    // Create dynamic info label for the hovered or searched district
    function setLabel(d) {
        var props = getProps(d);
        var labelAttribute = "<h1>" + formatValue(expressed, Number(props[expressed]), false) + "</h1><b>" + formatAttributeName(expressed) + "</b>";

        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", "boro" + props.BoroCD + "_label")
            .html(labelAttribute);

        infolabel.append("div")
            .attr("class", "labelname")
            .html(props.Location || ("BoroCD " + props.BoroCD));
    }

    // Keep the dynamic label near cursor while preventing viewport overflow
    function moveLabel(event) {
        var label = d3.select(".infolabel");
        if (label.empty()) {
            return;
        }

        var labelWidth = label.node().getBoundingClientRect().width;
        var x1 = event.clientX + 10;
        var y1 = event.clientY - 75;
        var x2 = event.clientX - labelWidth - 10;
        var y2 = event.clientY + 20;

        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        var y = event.clientY < 75 ? y2 : y1;

        label
            .style("left", x + "px")
            .style("top", y + "px");
    }

    // Attach click handlers that switch active tab button and panel
    function setTabs() {
        var buttons = d3.selectAll(".tab-button");
        if (buttons.empty()) {
            return;
        }

        buttons.on("click", function () {
            var targetId = d3.select(this).attr("data-tab-target");

            d3.selectAll(".tab-button")
                .classed("active", false)
                .attr("aria-selected", "false");

            d3.selectAll(".tab-panel")
                .classed("active", false)
                .attr("hidden", true);

            d3.select(this)
                .classed("active", true)
                .attr("aria-selected", "true");

            d3.select("#" + targetId)
                .classed("active", true)
                .attr("hidden", null);
        });
    }
})();