var map = L.map('map', {
  center: [35.7806, -78.6389],
  zoom: 3
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

var museum = L.marker([35.7822,-78.6394]).addTo(map);

// JSONP request found in tutorial at: https://developers.google.com/maps/tutorials/visualizing/earthquakes
var script = document.createElement('script');

script.src = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojsonp?callback=JSON_CALLBACK';
document.getElementsByTagName('head')[0].appendChild(script);

var earthquakes;
function eqfeed_callback(results) {
  earthquakes = L.geoJson(results, {
    style: function (feature) {
      return {radius: feature.properties.mag * 2};
    },

    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng);
    },

    onEachFeature: earthquakePopups
  }).addTo(map);
}

function earthquakePopups(feature, layer) {
  layer.bindPopup("<h5>"+feature.properties.place+
    "</h5><p><strong>Magnitude: </strong>"+feature.properties.mag+
    "</p><p><strong>Depth: </strong>"+feature.geometry.coordinates[2]+" km"+
    "</p><p><strong>Time: </strong>"+new Date(feature.properties.time)+
    "</p><a href="+feature.properties.url+"><p>More info</p></a>")
}

//add plate boundaries (http://www.ig.utexas.edu/research/projects/plates/data.htm)
$.getJSON('js/plates.geojson', function(data) {
  L.geoJson(data, {
    style: {
      "color": "#c37800",
      "weight": 3,
      "opacity": 1
    }
  }).addTo(map);
});

//add US earthquake hazard map (http://earthquake.usgs.gov/hazards/products/conterminous/)
// $.getJSON('js/usHazard.geojson', function(data) {
//   L.geoJson(data, {
//     style: {
//       "opacity": 0.5
//     }
//   }).addTo(map);
// });
 //L.tileLayer.wms("http://services.nconemap.com/arcgis/services/Imagery/Orthoimagery_2013/ImageServer/WMSServer?request=GetCapabilities&service=WMS&version=1.1.1", {
//   layers: "",
//   format: "image/png"
// }).addTo(map);
