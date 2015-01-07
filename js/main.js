var southWest = L.latLng(33.5, -85),
  northEast = L.latLng(37, -75),
  bounds = L.latLngBounds(southWest, northEast);

var map = L.map("map", {
  // center: [35.7806, -78.6389],
  minZoom: 7,
  maxBounds: bounds
});

map.fitBounds(bounds);

L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
  attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd',
}).addTo(map);

//var museum = L.marker([35.7822,-78.6394]).addTo(map);

//Create svg layer and append to leaflet pane
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
  g = svg.append("g").attr("class", "leaflet-zoom-hide");

//Load geojson data and process and add to map
d3.json("js/TornadoesNCwgs84.geojson", function(tornadoes) {

  //This function projects the tornado path data into Leaflet Lat/Lon
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  //Transform data from GeoJSON to SVG with d3.geo.path
  var transform = d3.geo.transform({point: projectPoint}),
    tornadoPaths = d3.geo.path().projection(transform);

  //Color tornado paths based on season
  function seasonColor(season) {
    if (season === "Spring") {
      return "#aaff7f";
    } else if (season === "Summer") {
      return "#fbd528";
    } else if (season === "Fall") {
      return "#ff5500";
    } else if (season === "Winter") {
      return "#7eaed9";
    }
  }

  var tornado = g.selectAll("path")
    .data(tornadoes.features)
    .enter().append("path")
    .attr({
      "class": function(d) { return "tornado-path " + d.properties.SEASON; },
      "stroke": function(d) { return seasonColor(d.properties.SEASON); },
      "opacity": 1
    });

  createKey();
  createCompass();
  updateView();
  map.on("viewreset", updateView);

  function updateView() {
    var bounds = tornadoPaths.bounds(tornadoes),
      topLeft = bounds[0],
      bottomRight = bounds[1];

    svg.attr({
      "width": bottomRight[0] - topLeft[0],
      "height": bottomRight[1] - topLeft[1]
    })
    .style({
      "left": topLeft[0] + "px",
      "top": topLeft[1] + "px"
    });

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
    tornado.attr("d", tornadoPaths);
  }

  //Create key to describe map
  function createKey() {
    var key = d3.select("#mapKey").append("svg")
      .attr("class", "key-svg");
    var yPadding = 50,
      xPadding = 25,
      seasons = ["Spring", "Summer", "Fall", "Winter"];

    //Create path symbols
    key.selectAll("rect")
      .data(seasons)
      .enter().append("rect")
      .attr({
        "x": xPadding + 30 + "px",
        "y": function(d, i) { return i * 30 + yPadding - 2 + "px"; },
        "fill": function(d) { return seasonColor(d); },
        "width": "30px",
        "height": "4px"
      });

    var checkBoxes = key.append("g");

    checkBoxes.selectAll("rect")
      .data(seasons)
      .enter().append("rect")
      .attr({
        "class": function(d) { return "check-box " + d; },
        "x": xPadding + "px",
        "y": function(d, i) { return i * 30 + yPadding - 10 + "px"; },
        "fill": function(d) { return seasonColor(d); },
        "width": "20px",
        "height": "20px"
      });

    d3.selectAll(".check-box")
      .on("click", function() {
        var box = d3.select(this),
          color = seasonColor(box.datum());

        if (box.attr("fill") === "#fff") {
          box.attr("fill", color);
          d3.selectAll(".tornado-path." + box.datum())
            .transition()
            .attr("opacity", 1);
          d3.selectAll(".compass-path." + box.datum())
            .transition()
            .attr("width", d3.select(".compass-svg").style("height").split("p")[0] / 2 - 7);
        } else {
          box.attr("fill", "#fff");
          d3.selectAll(".tornado-path." + box.datum())
            .transition()
            .attr("opacity", 0);
          d3.selectAll(".compass-path." + box.datum())
            .transition()
            .attr("width", "0px");
        }

      });

    //Add season text next to symbols
    key.selectAll("text")
      .data(seasons)
      .enter().append("text")
      .attr({
        "x": xPadding + 70 + "px",
        "y": function(d, i) { return i * 30 + yPadding + "px"; },
        "alignment-baseline": "central"
      })
      .text(function(d) { return d; });

      //Add key title
    key.append("text")
      .attr({
        "class": "key-title",
        "x": xPadding + 30 + "px",
        "y": "30px"
      })
      .text("Season of Tornado Occurrence");
  }

  function createCompass() {
    var compass = d3.select("#pathCompass").append("svg")
      .attr("class", "compass-svg");
    var compassWidth = parseInt(compass.style("width").split("p")[0]),
      compassHeight = parseInt(compass.style("height").split("p")[0]),
      rectHeight = 2;

    //Filter data to select only tornadoes with start/stop lat/lon coordinates
    var availableData = tornadoes.features.filter( function(d) {
      return d.properties.ELAT !== "0.0";
    });

    //Add paths to diagram showing direction relative to compass
    compass.selectAll("rect")
      .data(availableData)
      .enter().append("rect")
      .attr({
        "class": function(d) { return "compass-path " + d.properties.SEASON; },
        "x": compassWidth / 2 + 5 + "px",
        "y": compassHeight / 2 - rectHeight / 2 + "px",
        "width": compassHeight / 2 - 10,
        "height": rectHeight + "px",
        "transform": function(d) { return "rotate(" +
          -d.properties.ANGLE * (180 / Math.PI) + "," +
          compassWidth / 2 + "," + compassHeight / 2 + ")"; },
        "fill": function(d) { return seasonColor(d.properties.SEASON); }
      });

    var axes = compass.append("g")
      .attr("class", "axis");

    axes.append("rect")
      .attr({
        "class": "x-axis",
        "x": compassWidth / 2 - compassHeight / 2,
        "y": compassHeight / 2 - rectHeight / 2 + "px",
        "width": compassHeight,
        "height": rectHeight
      });

    axes.append("rect")
      .attr({
        "class": "y-axis",
        "x": compassWidth / 2 - rectHeight / 2 + "px",
        "y": "0px",
        "width": rectHeight,
        "height": compassHeight
      });
  }

});

// function earthquakePopups(feature, layer) {
//   layer.bindPopup("<h5>"+feature.properties.place+
//     "</h5><p><strong>Magnitude: </strong>"+feature.properties.mag+
//     "</p><p><strong>Depth: </strong>"+feature.geometry.coordinates[2]+" km"+
//     "</p><p><strong>Time: </strong>"+new Date(feature.properties.time)+
//     "</p><a href="+feature.properties.url+"><p>More info</p></a>");
// }
