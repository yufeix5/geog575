//initialize function called when the script loads
function initialize(){
	cities();
};

//function to create a table with cities and their populations
function cities(){
	//define two arrays for cities and population
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

	//append the table element to the div
	$("#mydiv").append("<table>");

	//append a header row to the table
	$("table").append("<tr>");
	
	//add the "City" and "Population" columns to the header row
	$("tr").append("<th>City</th><th>Population</th>");
	
	//loop to add a new row for each city
    for (var i = 0; i < cityPop.length; i++){
        //assign longer html strings to a variable
        var rowHtml = "<tr><td>" + cityPop[i].city + "</td><td>" + cityPop[i].population + "</td></tr>";
        //add the row's html string to the table
        $("table").append(rowHtml);
    };

    addColumns(cityPop);
    addEvents();
};

//function to add a city size column to the table
function addColumns(cityPop){
	//for each row, add a new column with the city size category
  	$("tr").each(function(i){
		//if the header row
		if (i === 0){
		$(this).append("<th>City Size</th>");
		} else {
			//if not the header row, add a category
			var citySize;
			if (cityPop[i-1].population < 100000) citySize = "Small"; //-1 because first row is header
			else if (cityPop[i-1].population < 500000) citySize = "Medium";
			else citySize = "Large";

			$(this).append("<td>" + citySize + "</td>");
		}
	});
}


//function to add events to the table
function addEvents(){
	//change the color of the table text when mouse is over it
	document.querySelector("table").addEventListener("mouseover", function(){
		//generate a random color
		var color = "rgb(";
		for (var i=0; i<3; i++){
			var random = Math.round(Math.random() * 255);
			color += random;
			//add the comma for the first two numbers
			if (i<2){
				color += ",";
			} else {
				color += ")";
			}
		};
		//change the color of the table text
		document.querySelector("table").style.color = color;

	});
	//add a click event to the table
	function clickme(){
		alert('Hey, you clicked me!');
	};

	document.querySelector("table").addEventListener("click", clickme)
};

// run after DOM is ready
$(document).ready(initialize);