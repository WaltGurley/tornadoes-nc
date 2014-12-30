var southWest = L.latLng(34, -83.5),
  northEast = L.latLng(37, -75.5),
  bounds = L.latLngBounds(southWest, northEast);

var map = L.map("map", {
  // center: [35.7806, -78.6389],
  minZoom: 7,
  maxBounds: bounds
});

map.fitBounds(bounds);

L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png").addTo(map);

var museum = L.marker([35.7822,-78.6394]).addTo(map);

var svg = d3.select(map.getPanes().overlayPane).append("svg"),
  g = svg.append("g").attr("class", "leaflet-zoom-hide");

d3.json("js/TornadoesNCwgs84.geojson", function(tornadoes) {
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  var transform = d3.geo.transform({point: projectPoint}),
    tornadoPaths = d3.geo.path().projection(transform);
console.log(tornadoes.features);
  var tornado = g.selectAll("path")
    .data(tornadoes.features)
    .enter().append("path")
    .attr("d", tornadoPaths);
});

function lineLatLon(d) {
  var x = d.geometry.coordinates[0],
    y = d.geometry.coordinates[1];
  return map.latLngToLayerPoint(new L.LatLng(y, x));
}

// function earthquakePopups(feature, layer) {
//   layer.bindPopup("<h5>"+feature.properties.place+
//     "</h5><p><strong>Magnitude: </strong>"+feature.properties.mag+
//     "</p><p><strong>Depth: </strong>"+feature.geometry.coordinates[2]+" km"+
//     "</p><p><strong>Time: </strong>"+new Date(feature.properties.time)+
//     "</p><a href="+feature.properties.url+"><p>More info</p></a>");
// }
