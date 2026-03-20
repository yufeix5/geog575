//D3 Bubble Chart - Week 8 Activity 8
//Based on Week 2 simple dataset (Wisconsin cities)
//This version will be saved as bubblechart.js for Week 9 replacement

window.onload = function(){

    //SVG dimensions
    var w = 900, h = 500;

    //Create SVG container
    var container = d3.select("body")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container")
        .style("background-color", "rgba(0,0,0,0.2)");
    
    //Inner rectangle for chart area
    var innerRect = container.append("rect")
        .datum(400)
        .attr("width", function(d){ return d * 2; })
        .attr("height", function(d){ return d; })
        .attr("class", "innerRect")
        .attr("x", 50)
        .attr("y", 50)
        .style("fill", "#FFFFFF");

    //Simple dataset - Wisconsin cities with population data
    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    //Example 3.3 - scale for circles center x coordinate
    var x = d3.scaleLinear()
        .range([90, 750])
        .domain([0, 3]);

    //Find min and max population values
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //Example 3.3 - scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50])
        .domain([0, 700000]);

    //Color scale generator
    var color = d3.scaleLinear()
        .range(["#FDBE85", "#D94701"])
        .domain([minPop, maxPop]);

    //Example 3.4 - create circles and bind data
    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){ return d.city; })
        .attr("r", function(d){
            var area = d.population * 0.01;
            return Math.sqrt(area / Math.PI);
        })
        .attr("cx", function(d, i){ return x(i); })
        .attr("cy", function(d){ return y(d.population); })
        .style("fill", function(d){ return color(d.population); })
        .style("stroke", "#000");

    //Example 3.6 - create y axis generator
    var yAxis = d3.axisLeft(y);

    //Example 3.9 - create axis g element and add axis with translation
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50,0)")
        .call(yAxis);

    //Example 3.12 - create title
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");
        
    //Example 3.14 line 1...create circle labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population);
        });

    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

     //create format generator
     var format = d3.format(",");
    
    //second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15")   //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population);      //use format generator to format numbers
        });
};