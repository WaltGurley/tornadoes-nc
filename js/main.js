var southWest = L.latLng(33.5, -85),
  northEast = L.latLng(37, -75),
  bounds = L.latLngBounds(southWest, northEast),
  autoPlay; // where the setInterval function is stored (play/stop graphics)

var map = L.map("map", {
  // center: [35.7806, -78.6389],
  minZoom: 7,
  maxBounds: bounds
});

map.fitBounds(bounds);

L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

//var museum = L.marker([35.7822,-78.6394]).addTo(map);

//Create svg layer and append to leaflet pane
var svg = d3.select(map.getPanes().overlayPane).append("svg"),
  g = svg.append("g").attr("class", "leaflet-zoom-hide");

//Load geojson data and process and add to map
d3.json("js/TorNCwgs84estTZ.geojson", function(tornadoes) {

  filteredTornadoes = tornadoes.features.filter(function(d) {
    return new Date(d.properties.DATE) >= new Date(1980,0,1);
  });

  //This function projects the tornado path data into Leaflet Lat/Lon
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  //Transform data from GeoJSON to SVG with d3.geo.path
  var transform = d3.geo.transform({point: projectPoint}),
    tornadoPaths = d3.geo.path().projection(transform);

  //Create tornado geo paths and create empty variables for compass and graph
  // svg data
  var tornadoGeo = g.selectAll("path")
    .data(filteredTornadoes)
    .enter().append("path")
    .attr({
      "class": function(d) { return "toggle tornado-path " + d.properties.SEASON; },
      "opacity": 1
    }),
    tornadoComp, // SVG displaying tornado path direction
    tornadoGraph; // SVG displaying bar graph of tornadoes by day of year

  //Create variables that several functions need from slider
  var sliderDate, // the position of the slider (used for all graphics)
    cumulative = true, // true = show cumulative data, false = show daily data
    autoPlaySpeed = 5, // store speed of autoplay (in milliseconds)
    tornadoDateRange; // min and max date of data

  updateView();
  map.on("viewreset", updateView);

  //Redraw d3 map items on zoom and pan
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
    tornadoGeo.attr("d", tornadoPaths);

    tornadoGeo.attr({
      "stroke-dasharray": function(d) {
        return this.getTotalLength() + " " + this.getTotalLength();
      },
      "stroke-dashoffset": function(d) {
        return d3.select(this).classed("dateOff") ||
          d3.select(this).classed("seasonOff") ? this.getTotalLength() : 0;
      }
    });
  }

  //Create key, graph, compass svg and get size metrics
  var key = d3.select("#mapKey");
  var graph = d3.select("#graph").append("svg")
      .attr({
        "class": "graph-svg",
        // "shape-rendering": "crispEdges"
      }),
    graphWidth = parseInt(graph.style("width").split("p")[0]),
    graphHeight = parseInt(graph.style("height").split("p")[0]),
    graphPaddingVert = 25,
    graphPaddingHor = 15,
    maxLength; //Holder for count of tornadoes occurring on most active day

  // Scale used to place marker on graph for day of year
  var timeOfYearScale = d3.scale.linear()
    .domain([0, 366])
    .range([graphPaddingHor, graphWidth - graphPaddingHor]);

  var timeFormat = d3.time.format("%j");
  tornadoDay = d3.nest()
    .key(function(d) { return parseInt(timeFormat(new Date(d.DATE))); })
    .map(filteredTornadoes.map(function(d) { return d.properties; }) );


  var compass = d3.select("#pathCompass").append("svg").attr("class", "compass-svg"),
    compassWidth = parseInt(compass.style("width").split("p")[0]),
    compassHeight = parseInt(compass.style("height").split("p")[0]),
    minorLength = compassWidth > compassHeight ? compassHeight - 10 : compassWidth - 10,
    rectHeight = 2;

  //Filter data to select only tornadoes with start/stop lat/lon coordinates
  //for tornado degree direction
  var directionData = filteredTornadoes.filter(function(d) {
    return d.properties.ELAT !== "0.0";
  });

  createKey();
  createGraph();
  createCompass();
  createSlider();

  //Create key for indicating seasonal data and toggling seasonal data on/off
  function createKey() {
    var seasons = ["Spring", "Summer", "Fall", "Winter"],
      xPadding = 10, yPadding = 10,
      boxSide = 50;

    var keyItem = d3.select("#mapKey")
      .selectAll("key-svg")
        .data(seasons)
        .enter().append("svg")
          .attr("class", "key-svg");

    //Add buttons to toggle data on/off
    keyItem.append("rect")
      .attr({
        "class": function(d) { return "check-box " + d; },
        "x": xPadding,
        "y": yPadding,
        "rx": 5,
        "ry": 5,
        "width": boxSide,
        "height": boxSide
      });

    //Add map symbol
    keyItem.append("rect")
      .attr({
        "class": function(d) { return "legend " + d; },
        "x": xPadding * 2 + boxSide,
        "y": yPadding + boxSide / 2 - 2,
        "width": 30,
        "height": 4
      });

    //Add season text next to symbols
    keyItem.append("text")
      .attr({
        "class": "svg-text",
        "x": xPadding * 3 + boxSide + 30,
        "y": yPadding + boxSide / 2,
        "alignment-baseline": "central"
      })
      .text(function(d) { return d; });

    //Add interactivity to buttons
    d3.selectAll(".check-box")
    .on("click", function() {
      var box = d3.select(this),
      color = box.datum();

      if (box.classed("faded")) {
        box.classed(color, true);
        box.classed("faded", false);
        d3.selectAll(".tornado-path." + box.datum()).classed("seasonOff", false);
        d3.selectAll(".compass-path." + box.datum()).classed("seasonOff", false);

        d3.selectAll(".graph-path." + box.datum()).classed("seasonOff", false);

      } else {
        box.classed(color, false);
        box.classed("faded", true);
        d3.selectAll(".tornado-path." + box.datum()).classed("seasonOff", true);
        d3.selectAll(".compass-path." + box.datum()).classed("seasonOff", true);
        d3.selectAll(".graph-path." + box.datum()).classed("seasonOff", true);
      }

      updateVis(sliderDate);
    });
  }

  //Create bar graph of tornadoes by day of year (0-366)
  function createGraph() {
    //Set up axes for graph
    var timeScale = d3.time.scale()
      .domain([new Date(2012, 0, 1), new Date(2012, 11, 31)])
      .range([graphPaddingHor, graphWidth - graphPaddingHor]);
    var xAxis = d3.svg.axis()
      .scale(timeScale)
      .tickFormat(d3.time.format("%b"))
      .orient("bottom");

    //Max count of tornadoes that have occurred on one day
    maxLength = d3.max(d3.values(tornadoDay), function(d) { return d.length; });

    tornadoGraph = graph.selectAll("rect")
      .data(d3.entries(tornadoDay))
      .enter().append("rect")
        .attr({
          "class": function(d) { return "toggle graph-path " + d.value[0].SEASON; },
          "x": function(d) {
            return (graphWidth - graphPaddingHor * 2) / 366 * d.key + graphPaddingHor;
          },
          "width": (graphWidth - graphPaddingHor * 2) / 366
        });

    graph.append("g")
      .attr("class", "graph-axis")
  		.attr("transform", "translate(0," + (graphHeight - graphPaddingVert) + ")")
      .call(xAxis);

    graph.append("rect")
      .attr({
        "class": "day-pointer2",
        "width": (graphWidth - graphPaddingHor * 2) / 366,
        "height": graphHeight - graphPaddingVert,
        "y": 0,
        "x": graphPaddingHor
      });

    // var barWidth = (graphWidth - graphPaddingHor * 2) / 366;
    // d3.select(".graph-axis")
    //   .append("path")
    //   .attr({
    //     "class": "day-pointer1",
    //     "d": "M" + barWidth  + ",0 L" + barWidth * 2 + ",0 L" + barWidth * 4 +
    //      ",6 L" + -barWidth + ",6 Z",
    //     "transform": "translate(" + (graphPaddingHor - 3) + ",0)"
    //   });
  }

  //Add paths to diagram showing direction relative to compass
  function createCompass() {
    tornadoComp = compass.selectAll("rect")
      .data(directionData)
      .enter().append("rect")
      .attr({
        "class": function(d) { return "toggle compass-path " + d.properties.SEASON; },
        "x": compassWidth / 2 + 2,
        "y": compassHeight / 2 - rectHeight / 2,
        "height": rectHeight,
        "transform": function(d) { return "rotate(" +
          -d.properties.ANGLE * (180 / Math.PI) + "," +
          compassWidth / 2 + "," + compassHeight / 2 + ")"; }
      });

    //Add NS and EW axes
    var axes = compass.append("g")
      .attr("class", "axis");

    axes.append("rect")
      .attr({
        "class": "x axis-line",
        "x": compassWidth / 2 - minorLength / 2,
        "y": compassHeight / 2 - rectHeight / 2,
        "width": minorLength,
        "height": rectHeight
      });

      axes.append("rect")
      .attr({
        "class": "y axis-line",
        "x": compassWidth / 2 - rectHeight / 2,
        "y": compassHeight / 2 - minorLength / 2,
        "width": rectHeight,
        "height": minorLength
      });

    axes.append("text")
      .attr({
        "class": "svg-text",
        "x": compassWidth / 2 + -minorLength / 2 - 5,
        "y": compassHeight / 2,
        "font-size": 20,
        "alignment-baseline": "central",
        "text-anchor": "start"
      })
      .text("W");

    axes.append("text")
      .attr({
        "class": "svg-text",
        "x": compassWidth / 2 + minorLength / 2 + 5,
        "y": compassHeight / 2,
        "font-size": 20,
        "alignment-baseline": "central",
        "text-anchor": "end"
      })
      .text("E");

    axes.append("text")
      .attr({
        "class": "svg-text",
        "x": compassWidth / 2,
        "y": compassHeight / 2 + -minorLength / 2 - 5,
        "font-size": 20,
        "alignment-baseline": "hanging",
        "text-anchor": "middle"
      })
      .text("N");

    axes.append("text")
      .attr({
        "class": "svg-text",
        "x": compassWidth / 2,
        "y": compassHeight / 2 + minorLength / 2 + 5,
        "font-size": 20,
        "alignment-baseline": "baseline",
        "text-anchor": "middle"
      })
      .text("S");
  }

  //Create slider to change data based on date
  function createSlider() {
    var dateFormat = d3.time.format("%Y-%m-%d"),
    tornadoDate = d3.nest()
      .key(function(d) { return dateFormat(new Date(d.DATE)); })
      .map(filteredTornadoes.map(function(d) { return d.properties; }) );

    tornadoDateRange = d3.extent(d3.keys(tornadoDate));

    sliderDate = +new Date(tornadoDateRange[1]);

    var dateSlider = d3.select("#slider")
      .append("input")
      .attr({
        "class": "date-slider",
        "type": "range",
        "min": +new Date(tornadoDateRange[0]),
        "max": +new Date(tornadoDateRange[1]),
        "step": 86400000,
        "value": sliderDate
      });

    //Update data based on slider position
    dateSlider.on("input", function() {
      sliderDate = parseInt(this.value);
      clearInterval(autoPlay);
      d3.select(".play-btn").classed("fontawesome-pause", false);
      d3.select(".play-btn").classed("fontawesome-play", true);
      updateVis(sliderDate);
    });

    //Finish slider setup and draw everything after
    makeSliderScale();
    setupSliderControls();
    updateVis(sliderDate);

    //Make slider scale
    function makeSliderScale() {
      var sliderScale = d3.select(".slider-scale").append("svg")
          .attr({
            "class": "slider-scale-svg",
            "width": parseInt(dateSlider.style("width")),
            "height": 34
          });

      var timeScale = d3.time.scale()
        .domain([
          new Date(tornadoDateRange[0]),
          new Date(tornadoDateRange[1])
        ])
        .range([12, parseInt(dateSlider.style("width")) - 12]); //take width of slider-thumb into account for padding

      //create x-axis label for time slider (label by year)
      var xAxisSlider = d3.svg.axis()
        .scale(timeScale)
        .tickFormat(d3.time.format("%Y"))
        .ticks(d3.time.years, window.innerWidth <= 480 ? 4 : 2)
        .orient("bottom");

      //add lines to indicate dates with tornado(es)
      sliderScale.selectAll("rect")
        .data(d3.entries(tornadoDate))
        .enter().append("rect")
        .attr({
          "class": function(d) { return d.value[0].SEASON; },
          "x": function(d) { return timeScale(new Date(d.key)); },
          "y": 0,
          "height": 12,
          "width": 1,
        });

      //add callouts for significant events
      var sigEventDates = ["1984-03-28", "1988-11-28", "1989-05-05", "1992-11-23", "1998-03-20", "2008-05-08", "2010-03-28", "2011-04-16", "2012-03-03", "2013-11-26"];

      var sigEvents = sliderScale.append("g").attr("transform", "translate(0,12)");

      sigEvents.selectAll("sig-event")
        .data(sigEventDates)
        .enter().append("rect")
        .attr({
          "class": "sig-event",
          "x": function(d) { return timeScale(new Date(d)); },
          "height": 24,
          "width": 2,
          "fill": "#ff2a2a"
        });

      //add time scale labeled by year (xAxisSlider)
      sliderScale.append("g")
        .attr("class", "slider-axis")
    		.attr("transform", "translate(0,12)")
        .call(xAxisSlider);

    }

    //Set up controls to play, speed up, and change view type with slider
    function setupSliderControls() {
      var viewControls = d3.selectAll(".view-type-btn");

      //Toggle view from cumulative tornadoes to daily tornadoes
      viewControls.on("click", function() {
        var pressedBtn = d3.select(this);

        viewControls.classed("active", false);
        pressedBtn.classed("active", true);

        if (pressedBtn.text() === "Cumulative") {
          cumulative = true;
        } else if (pressedBtn.text() === "Daily") {
          cumulative = false;
        }

        updateVis(sliderDate);
      });

      //Toggle autoplay on and off (Play/Pause)
      d3.select(".play-btn").on("click", function() {
        var state = d3.select(this);

        if (state.classed("fontawesome-play")) {
          state.classed("fontawesome-play", false);
          state.classed("fontawesome-pause", true);
          animateAll();
        } else if (state.classed("fontawesome-pause")) {
          state.classed("fontawesome-pause", false);
          state.classed("fontawesome-play", true);
          clearTimeout(autoPlay);
        }
      });

      //Set speed of transitions
      d3.select(".speed-btn").on("click", function() {
        var state = d3.select(this);

        if (autoPlaySpeed <= 5) {
          autoPlaySpeed = 1280;
          state.selectAll("span").remove();
          state.append("span").attr("class","fontawesome-chevron-right");
        } else {
          autoPlaySpeed /= 4;
          state.append("span").attr("class","fontawesome-chevron-right");
        }

        if (d3.select(".play-btn").classed("fontawesome-pause")) {
          clearTimeout(autoPlay);
          animateAll();
        }
      });

      function animateAll() {
        autoPlay = setTimeout(function() {
          if (dateFormat(new Date(sliderDate)) ===
          dateFormat(new Date(tornadoDateRange[1]))) {
            sliderDate = +new Date(tornadoDateRange[0]);
          } else {
            sliderDate += 86400000;
          }
          d3.select(".date-slider").property("value", sliderDate);
          updateVis(sliderDate);
          animateAll();
        }, autoPlaySpeed);
      }
    }
  }

  //Animate map, graph, and compass on data filter change (date/slider or season)
  function updateVis(date) {

    var sliderTextFormat = d3.time.format("%b %d, %Y"),
    dateFormat = d3.time.format("%Y-%m-%d"),
    dayOfYearFormat = d3.time.format("%j");

    d3.select(".slider-text")
      .text(cumulative ?
        sliderTextFormat(new Date(tornadoDateRange[0])) + " - " +
        sliderTextFormat(new Date(date))
        :
        sliderTextFormat(new Date(date))
      );

    tornadoGeo.classed("dateOff", function(d) {
      return cumulative ?
        new Date(d.properties.DATE + "T00:00:00-05:00") >= new Date(date)
        :
        dateFormat(new Date(d.properties.DATE + "T00:00:00-05:00")) !==
        dateFormat(new Date(date));
    });

    tornadoComp.classed("dateOff", function(d) {
      return cumulative ?
        new Date(d.properties.DATE + "T00:00:00-05:00") >= new Date(date)
        :
        dateFormat(new Date(d.properties.DATE + "T00:00:00-05:00")) !==
        dateFormat(new Date(date));
    });

    //Remove lines from map that have not occured before slider 'date'
    tornadoGeo.transition().duration(autoPlaySpeed)
      .attr("stroke-dashoffset", function(d) {
        return d3.select(this).classed("dateOff") ||
          d3.select(this).classed("seasonOff") ? this.getTotalLength() : 0;
      });

    //Remove lines from compass that have not occured before slider 'date'
    tornadoComp.transition().duration(autoPlaySpeed)
      .attr("width", function(d) {
        return d3.select(this).classed("dateOff") ||
          d3.select(this).classed("seasonOff") ?
          0 : (d.properties.MAG_INT + 1) / 5 * minorLength / 2 - 10;
      });

    //Change bar graph height to reflect tornados occuring before slider 'date'
    tornadoGraph.transition().duration(autoPlaySpeed)
      .attr({
        "y": function(d) {
          return d3.select(this).classed("seasonOff") ?
            graphHeight - graphPaddingVert :
            graphHeight - graphPaddingVert -
            (graphHeight - graphPaddingVert * 2) *
            (d.value.filter(filterByDate).length / maxLength);
        },
        "height": function(d) {
          return d3.select(this).classed("seasonOff") ?
            0 :
            (graphHeight - graphPaddingVert * 2) *
            (d.value.filter(filterByDate).length / maxLength);
        }
      });

    d3.select(".day-pointer1").transition().duration(autoPlaySpeed)
      .attr("transform", "translate(" +
        (timeOfYearScale(dayOfYearFormat(new Date(date))) - 3) + ",0)"
      );

    d3.select(".day-pointer2").transition().duration(autoPlaySpeed)
      .attr("x", (timeOfYearScale(dayOfYearFormat(new Date(date)))));

    //Filter tornado graph data to change bar height
    function filterByDate(torDate) {
      var dateFormat = d3.time.format("%Y-%m-%d");
      return cumulative ?
      new Date(torDate.DATE + "T00:00:00-05:00") <= new Date(date) :
      dateFormat(new Date(torDate.DATE + "T00:00:00-05:00")) ===
      dateFormat(new Date(date));
    }

  }

});

// function earthquakePopups(feature, layer) {
//   layer.bindPopup("<h5>"+feature.properties.place+
//     "</h5><p><strong>Magnitude: </strong>"+feature.properties.mag+
//     "</p><p><strong>Depth: </strong>"+feature.geometry.coordinates[2]+" km"+
//     "</p><p><strong>Time: </strong>"+new Date(feature.properties.time)+
//     "</p><a href="+feature.properties.url+"><p>More info</p></a>");
// }
