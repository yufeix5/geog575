(function () {
    // Activity 10
    // global variables for coordinated views
    var attrArray = [
        "median_rent",
        "median_income",
        "rent_income_ratio",
        "food_density",
        "park_area_ratio",
        "avg_commute_time"
    ];

    // Initial expressed attribute
    var expressed = "rent_income_ratio";

    // Start script on page load
    window.onload = setMap;

    function setMap() {
        // Map frame dimensions
        var mapWidth = window.innerWidth * 0.5;
        var mapHeight = 460;

        // Create map SVG container
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight);

        // UI controls container
        var controls = d3.select("body")
            .insert("div", ":first-child")
            .attr("class", "controls");

        // Dropdown for attribute switching
        var dropdown = controls.append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData);
            });

        // Add dropdown options
        attrArray.forEach(function (attr) {
            dropdown.append("option")
                .attr("value", attr)
                .text(formatAttributeName(attr));
        });

        // Set initial dropdown value
        dropdown.property("value", expressed);

        // Shared csv variable in setMap scope
        var csvData;

        // Load TopoJSON + CSV + topojson client
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

            // Convert TopoJSON to GeoJSON features
            var geojson = topojsonClient.feature(topology, topology.objects.cd_final_topo).features;

            // Join CSV attributes to GeoJSON features
            joinData(geojson, csvData);

            // Projection fitted to map frame
            var projection = d3.geoMercator()
                .fitSize([mapWidth - 20, mapHeight - 70], {
                    type: "FeatureCollection",
                    features: geojson
                });

            // Path generator
            var path = d3.geoPath().projection(projection);

            // Build color scale
            var colorScale = makeColorScale(csvData);

            // Draw map and coordinated chart
            setEnumerationUnits(geojson, map, path, colorScale);
            setChart(csvData, colorScale);

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

    function makeColorScale(csvData) {
        // Quantile color scale for choropleth + bars
        var colorClasses = ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"];

        return d3.scaleQuantile()
            .range(colorClasses)
            .domain(csvData.map(function (d) {
                return d[expressed];
            }));
    }

    function choropleth(props, colorScale) {
        // Return fill based on current attribute
        var val = parseFloat(props[expressed]);
        if (Number.isFinite(val)) {
            return colorScale(val);
        }

        // Fallback for missing data
        return "#dddddd";
    }

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
            });

        // Tooltip per district
        districts.append("title")
            .text(function (d) {
                return d.properties.Location + "\n" + formatAttributeName(expressed) + ": " + d.properties[expressed].toFixed(2);
            });
    }

    function setChart(csvData, colorScale) {
        // Chart frame dimensions
        var chartWidth = window.innerWidth * 0.425;
        var chartHeight = 460;

        // Create chart SVG container
        var chart = d3.select("body")
            .append("svg")
            .attr("class", "chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        // Scale for bar heights
        var yScale = d3.scaleLinear()
            .range([0, chartHeight - 60])
            .domain([0, d3.max(csvData, function (d) { return d[expressed]; })]);

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
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function (d) {
                return yScale(d[expressed]);
            })
            .attr("y", function (d) {
                return chartHeight - yScale(d[expressed]);
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });

        // Value labels on bars
        chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function (a, b) {
                return a[expressed] - b[expressed];
            })
            .attr("class", function (d) {
                return "numbers boro" + d.BoroCD;
            })
            .attr("text-anchor", "middle")
            .attr("x", function (d, i) {
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function (d) {
                return chartHeight - yScale(d[expressed]) + 14;
            })
            .text(function (d) {
                return d[expressed].toFixed(1);
            });

        // Dynamic chart title
        chart.append("text")
            .attr("class", "chartTitle")
            .attr("x", 14)
            .attr("y", 28)
            .text(formatAttributeName(expressed) + " by Community District");

        // Tooltip per bar
        bars.append("title")
            .text(function (d) {
                return d.Location + "\n" + formatAttributeName(expressed) + ": " + d[expressed].toFixed(2);
            });
    }

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
                return d.properties.Location + "\n" + formatAttributeName(expressed) + ": " + d.properties[expressed].toFixed(2);
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

        // Update labels after sort
        d3.selectAll(".numbers")
            .sort(function (a, b) {
                return a[expressed] - b[expressed];
            })
            .transition()
            .delay(function (d, i) {
                return i * 5;
            })
            .duration(500)
            .attr("x", function (d, i) {
                var chartWidth = parseFloat(d3.select(".chart").attr("width"));
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function (d) {
                var chartHeight = parseFloat(d3.select(".chart").attr("height"));
                var yScale = d3.scaleLinear()
                    .range([0, chartHeight - 60])
                    .domain([0, d3.max(csvData, function (row) { return row[expressed]; })]);
                return chartHeight - yScale(d[expressed]) + 14;
            })
            .text(function (d) {
                return d[expressed].toFixed(1);
            });

        // Update bar tooltips + title
        d3.selectAll(".bars title")
            .text(function (d) {
                return d.Location + "\n" + formatAttributeName(expressed) + ": " + d[expressed].toFixed(2);
            });

        d3.select(".chartTitle")
            .text(formatAttributeName(expressed) + " by Community District");
    }

    function updateChart(bars, n, colorScale) {
        // Read current chart frame size
        var chartWidth = parseFloat(d3.select(".chart").attr("width"));
        var chartHeight = parseFloat(d3.select(".chart").attr("height"));

        // Scale with current expressed max
        var yScale = d3.scaleLinear()
            .range([0, chartHeight - 60])
            .domain([0, d3.max(d3.selectAll(".bars").data(), function (d) {
                return d[expressed];
            })]);

        // Update bar positions/sizes/colors
        bars
            .attr("x", function (d, i) {
                return i * (chartWidth / n);
            })
            .attr("height", function (d) {
                return yScale(d[expressed]);
            })
            .attr("y", function (d) {
                return chartHeight - yScale(d[expressed]);
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });
    }

    function formatAttributeName(attr) {
        // Convert snake_case to readable text
        return attr.replace(/_/g, " ");
    }
})();