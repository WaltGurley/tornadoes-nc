var map = L.map('map', {
  center: [35.7806, -78.6389],
  zoom: 3
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

var museum = L.marker([35.7822,-78.6394]).addTo(map);


// function earthquakePopups(feature, layer) {
//   layer.bindPopup("<h5>"+feature.properties.place+
//     "</h5><p><strong>Magnitude: </strong>"+feature.properties.mag+
//     "</p><p><strong>Depth: </strong>"+feature.geometry.coordinates[2]+" km"+
//     "</p><p><strong>Time: </strong>"+new Date(feature.properties.time)+
//     "</p><a href="+feature.properties.url+"><p>More info</p></a>");
// }
