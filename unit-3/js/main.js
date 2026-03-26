// Activity 9 

window.onload = function () {
    // These dimensions define the SVG canvas in pixel units.
    // The map itself is slightly inset later
    var width = 960;
    var height = 640;
    // Create the root SVG container
    // All map graphics (title and districts) are appended here.
    var container = d3.select("body")
        .append("svg")
        .attr("class", "container")
        .attr("width", width)
        .attr("height", height);

    // Header text
    // Title and subtitle are placed directly in SVG for consistent alignment.
    // This keeps map + labels in one visual coordinate system.
    var title = container.append("text")
        .attr("x", 20)
        .attr("y", 30)
        .attr("font-size", "20px")
        .attr("font-weight", "600")
        .text("NYC Community District Choropleth");

    var subtitle = container.append("text")
        .attr("x", 20)
        .attr("y", 55)
        .attr("font-size", "13px")
        .text("Activity 9: TopoJSON + CSV with Promise.all()");

    // UI controls container
    // The dropdown sits in regular HTML, positioned above the map.
    // Using an absolutely positioned div keeps it from affecting SVG layout.
    var controls = d3.select("body")
        .insert("div", ":first-child")
        .attr("class", "controls")
        .style("position", "absolute")
        .style("left", "20px")
        .style("top", "72px")
        .style("z-index", "10");

    // Attribute selector for choropleth variable switching.
    var dropdown = controls.append("select")
        .attr("id", "attribute-select")
        .style("padding", "6px");

    // Load all required resources concurrently
    // Promise.all waits until:
    // 1. TopoJSON geometry is loaded
    // 2. CSV attributes are loaded 
    // 3. topojson-client module is available
    Promise.all([
        d3.json("data/cd_final_topo.json"),
        d3.csv("data/cd_attributes.csv").catch(function () { return []; }),
        import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm")
    ]).then(function (results) {
        // Keep loaded resources in explicit variables for readability.
        var topology = results[0];
        var csvData = results[1];
        var topojsonClient = results[2];

        // Convert Topology to GeoJSON features
        var geoData = topojsonClient.feature(topology, topology.objects.cd_final_topo);
        var features = geoData.features;

        // Fallback keeps the map functional if CSV has not been created yet.
        // This is useful while developing, but your real submission should still
        // include and load the CSV for the assignment requirement.
        // if (!csvData || csvData.length === 0) {
        //     csvData = features.map(function (f) {
        //         return {
        //             BoroCD: f.properties.BoroCD,
        //             median_rent: f.properties.median_rent,
        //             median_income: f.properties.median_income,
        //             annual_rent: f.properties.annual_rent,
        //             rent_income_ratio: f.properties.rent_income_ratio,
        //             food_density: f.properties.food_density,
        //             park_area_ratio: f.properties.park_area_ratio,
        //             avg_commute_time: f.properties.avg_commute_time,
        //             Location: f.properties.Location
        //         };
        //     });
        //     console.warn("CSV not found at data/cd_attributes.csv; using TopoJSON properties as fallback.");
        // }

        // Define projection + path generator
        // fitSize scales and centers NYC features within the target map frame.
        var projection = d3.geoMercator()
            .fitSize([width - 40, height - 90], geoData);

        // Path generator transforms geographic coordinates into SVG path data.
        var path = d3.geoPath().projection(projection);

        //  Define available choropleth attributes
        var attributes = [
            "median_rent",
            "median_income",
            "rent_income_ratio",
            "food_density",
            "park_area_ratio",
            "avg_commute_time"
        ];

        // Populate dropdown options from the attribute list.
        attributes.forEach(function (attr) {
            dropdown.append("option")
                .attr("value", attr)
                .text(attr);
        });

        // Normalize CSV values into numbers
        // Convert ID + numeric attributes so classification and joins work.
        csvData.forEach(function (row) {
            row.BoroCD = +row.BoroCD;
            attributes.forEach(function (attr) {
                row[attr] = +row[attr];
            });
        });

        // Join CSV attributes into GeoJSON feature properties by BoroCD key.
        joinData(features, csvData, attributes);

        // Draw district polygons
        var districts = container.append("g")
            .attr("transform", "translate(20,70)")
            .selectAll(".district")
            .data(features)
            .enter()
            .append("path")
            .attr("class", "district")
            .attr("d", path)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.5)
            .attr("fill", "#cccccc");

        // Default thematic variable shown at initial render.
        var currentAttribute = "rent_income_ratio";

        // First choropleth paint.
        updateChoropleth(districts, currentAttribute, attributes);

        // Sync control state with current map state.
        dropdown.property("value", currentAttribute);

        // Recompute choropleth whenever user picks a different attribute.
        dropdown.on("change", function () {
            currentAttribute = this.value;
            updateChoropleth(districts, currentAttribute, attributes);
        });
    }).catch(function (error) {
        // Catch-all error reporter for network/data/module failures.
        console.error("Activity 9 data loading error:", error);
    });
};

function joinData(features, csvData, attributes) {
    // Join helper: copy CSV fields into matching geometry features
    // Build lookup map keyed by BoroCD to avoid nested loops.
    var dataById = new Map(csvData.map(function (row) { return [row.BoroCD, row]; }));

    // For each geometry feature, attach selected attribute values if found.
    features.forEach(function (feature) {
        var key = +feature.properties.BoroCD;
        var match = dataById.get(key);
        if (match) {
            // Copy each thematic numeric column.
            attributes.forEach(function (attr) {
                feature.properties[attr] = match[attr];
            });

            // Also attach a display name if available in CSV.
            feature.properties.Location = match.Location || feature.properties.Location;
        }
    });
}

function updateChoropleth(selection, expressed, attributes) {
    // Choropleth helper: classify values and recolor map polygons based on selected attribute
    // Extract the array of values for the currently expressed attribute.
    var values = selection.data()
        .map(function (d) { return +d.properties[expressed]; })
        .filter(function (v) { return Number.isFinite(v); });

    // Quantile scale creates classes with roughly equal feature counts.
    var colorScale = d3.scaleQuantile()
        .domain(values)
        .range(["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]);

    selection
        // Repaint each polygon based on the selected attribute value.
        .attr("fill", function (d) {
            var value = +d.properties[expressed];
            return Number.isFinite(value) ? colorScale(value) : "#dddddd";
        })
        // Native SVG tooltip for quick data inspection on hover.
        // appending each update creates duplicate title nodes over time;
        .append("title")
        .text(function (d) {
            var name = d.properties.Location || ("BoroCD " + d.properties.BoroCD);
            return name + "\n" + expressed + ": " + d.properties[expressed];
        });
}