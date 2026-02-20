/* Activity 5: Cenote Dive Sites - Riviera Maya */
var map;

// Define custom cave-diving icon
var caveIcon = L.icon({
    iconUrl: 'img/cave.png', // Make sure you placed a cave image in the img folder
    iconSize: [24, 32],           // icon size
    iconAnchor: [16, 16],         // icon anchor point
    popupAnchor: [0, -15]         // popup offset relative to the icon
});

function createMap(){
    // Initialize the map centered along the coastline between Playa del Carmen and Tulum
    map = L.map('map', {
        center: [20.55069390259844, -87.2803315461541],
        zoom: 10
    });

    // Add a standard basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    getData();
}

// Generate popup content automatically
function onEachFeature(feature, layer) {
    var popupContent = "";
    if (feature.properties) {
        // 1. Put the Name and Description at the top to highlight them
        if (feature.properties.Name) {
            popupContent += "<h3>" + feature.properties.Name + "</h3>";
        }
        if (feature.properties.Description) {
            popupContent += "<p><em>" + feature.properties.Description + "</em></p><hr>";
        }

        // Loop through the remaining properties
        for (var property in feature.properties){
            // Exclude already displayed Name and Description
            if (property !== "Name" && property !== "Description") {
                popupContent += "<p><strong>" + property + ":</strong> " + feature.properties[property] + "</p>";
            }
        }
        
        layer.bindPopup(popupContent); // Bind the generated HTML to the popup
    }
}

function getData(){
    // Load your Cenote data file
    fetch("data/cenotes.geojson") 
        .then(res => res.json())
        .then(json => {
            // Use the cave icon for point markers
            L.geoJson(json, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, { icon: caveIcon });
                },
                onEachFeature: onEachFeature
            }).addTo(map);
        });
}

document.addEventListener('DOMContentLoaded', createMap);