/* Activity 6 */

// global variables
var map;
var minValue;

// initiate the Leaflet map
function createMap() {
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    // add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    getData();
};

// calculate the min 
function calcMinValue(data) {
    var allValues = [];
    for (var city of data.features) {
        // loop through years and push each year's value to the allValues array
        for (var year = 1985; year <= 2015; year += 5) {
            var value = city.properties["Pop_" + String(year)];
            if (value > 0) allValues.push(value);
        }
    }
    return Math.min(...allValues);
}

// use the Flannery formula to calculate symbol radius based on attribute value
function calcPropRadius(attValue) {
    var minRadius = 5; // min radius for the smallest symbol
    var radius = 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
    return radius;
};

// pointToLayer function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng, attributes) {
    var attribute = attributes[0]; // default to the first attribute for initial display
    var attValue = Number(feature.properties[attribute]);

    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        radius: calcPropRadius(attValue) // dynamically calculate radius based on attribute value
    };

    var layer = L.circleMarker(latlng, options);

    // create popup content based on the attribute value and city name
    var year = attribute.split("_")[1];
    var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";
    popupContent += "<p><b>Population in " + year + ":</b> " + feature.properties[attribute] + " million</p>";
    
    layer.bindPopup(popupContent, {
        offset: new L.Point(0, -options.radius) 
    });

    return layer;
};

// add circle markers for point features to the map
function createPropSymbols(data, attributes) {
    L.geoJson(data, {
        pointToLayer: function(feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

// create slider and buttons for sequence control and add listeners
function createSequenceControls(attributes) {
    var panel = document.querySelector("#panel");

    // add slider 
    panel.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range" min="0" max="6" value="0" step="1">');
    
    // add button
    panel.insertAdjacentHTML('beforeend', '<button class="step" id="reverse"><img src="img/reverse.png"></button>');
    panel.insertAdjacentHTML('beforeend', '<button class="step" id="forward"><img src="img/forward.png"></button>');
    // listen for slider input
    document.querySelector('.range-slider').addEventListener('input', function() {
        var index = this.value;
        updatePropSymbols(attributes[index]);
    });

    // listern for button clicks
    document.querySelectorAll('.step').forEach(function(step) {
        step.addEventListener("click", function() {
            var index = document.querySelector('.range-slider').value;
            if (this.id == 'forward') {
                index++;
                index = index > 6 ? 0 : index;
            } else if (this.id == 'reverse') {
                index--;
                index = index < 0 ? 6 : index;
            }
            document.querySelector('.range-slider').value = index;
            updatePropSymbols(attributes[index]);
        });
    });
};

// when a new attribute is selected, update the symbols on the map
function updatePropSymbols(attribute) {
    map.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius); // update the radius 

            // update the popup content
            var year = attribute.split("_")[1];
            var popupContent = "<p><b>City:</b> " + props.City + "</p>";
            popupContent += "<p><b>Population in " + year + ":</b> " + props[attribute] + " million</p>";
            
            var popup = layer.getPopup();
            popup.setContent(popupContent).update();
        }
    });
};

// process data to extract attributes for the timeline
function processData(data) {
    var attributes = [];
    var properties = data.features[0].properties;
    for (var attribute in properties) {
        if (attribute.indexOf("Pop") > -1) {
            attributes.push(attribute);
        }
    }
    return attributes;
};

// fetch the data and call functions to create the map
function getData() {
    fetch("data/MegaCities.geojson")
        .then(res => res.json())
        .then(json => {
            var attributes = processData(json);
            minValue = calcMinValue(json);
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        });
};

document.addEventListener('DOMContentLoaded', createMap);