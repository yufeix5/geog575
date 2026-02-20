/* adaptedTutorial.js */

var map;

// init map
function createMap(){
    map = L.map('map', {
        center: [20, 0],
        zoom: 2
    });

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    getData();
};

// on each feature function to bind popups
function onEachFeature(feature, layer) {
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

// fetch the geojson data and add to map
function getData(){ 
    fetch("data/MegaCities.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            // set marker options
            var geojsonMarkerOptions = {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            };

            L.geoJson(json, {
                // make points as circle markers
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                },
                // bind popups to features
                onEachFeature: onEachFeature
            }).addTo(map);
        })  
};

document.addEventListener('DOMContentLoaded', createMap);