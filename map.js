
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FtaWN1dCIsImEiOiJMVzF2NThZIn0.WO0ArcIIzYVioen3HpfugQ';
mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js');

var map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'mapbox://styles/kamicut/ck1vedq510l101cocnbgs1ira',
  center: [35.413, 33.834], // starting position [lng, lat]
  zoom: 9 // starting zoom
});

function addProtestsLayer(map) {
  map.addLayer({
    id: 'geo_incidents',
    type: "symbol",
    source: {
      "type": "geojson",
      "data": "protests.geojson"
    },
    layout: {
      "text-field": ["to-string", ["get", "protest location"]],
      "icon-image": ["case",
        ["has", "tweet_id"], "marker-15",
        "none"
      ],
      "text-offset": [-1, 1],
      "icon-size": 1,
      "text-size": 15,
      "text-allow-overlap": false,
      "icon-allow-overlap": true
    },
    "paint": {
      "text-opacity": ["case",
        ["has", "tweet_id"], 1,
        0.4
      ],
      "text-color": "hsl(0, 50%, 90%)",
      "text-halo-color": "hsl(0, 100%, 0%)",
      "text-halo-width": 1
    }
  }, )
}

function addProtestsHeatmap(map) {
  map.addLayer({
    id: 'sat_incidents',
    type: "heatmap",
    source: {
      "type": "geojson",
      "data": "protests.geojson"
    },
    "paint": {
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "hsla(27, 100%, 50%, 0)",
        0.5,
        "hsl(35, 100%, 50%)",
        1,
        "red"
      ],
      "heatmap-opacity": 0.6
    },
  }, )
}

function forEachLayer(map, text, cb) {
  map.getStyle().layers.forEach((layer) => {
    if (!layer.id.includes(text)) return;

    cb(layer);
  });
}

// Changing the map base style
function changeStyle(map, style) {
  const savedLayers = [];
  const savedSources = {};
  const layerGroups = [
    'sat_incidents',
    'geo_incidents',
  ];

  layerGroups.forEach((layerGroup) => {
    forEachLayer(map, layerGroup, (layer) => {
      savedSources[layer.source] = map.getSource(layer.source).serialize();
      savedLayers.push(layer);
    });
  });

  map.setStyle(`mapbox://styles/${style}`);


  setTimeout(() => {
    Object.entries(savedSources).forEach(([id, source]) => {
      map.addSource(id, source);
    });

    savedLayers.forEach((layer) => {
      map.addLayer(layer);
    });
  }, 1000);
}


map.on('load', function() {
  addProtestsHeatmap(map)
  addProtestsLayer(map)
})

var layerList = document.getElementById('menu');
var inputs = layerList.getElementsByTagName('input');

function switchLayer(layer) {
  var layerId = layer.target.id;
  changeStyle(map, layerId)
}

for (var i = 0; i < inputs.length; i++) {
  inputs[i].onclick = switchLayer;
}

// hide button
var hideButton = document.querySelector('#hide')
var menubox = document.querySelector('#menubox')
var loader = document.querySelector('#loader')
var menuBoxShow = true

function toggleMenuBox () {
  menuBoxShow = !menuBoxShow
  menubox.style = menuBoxShow ? "" : "display: none"
  hideButton.innerHTML = menuBoxShow ? "[hide]" : "[show]"

}

hideButton.onclick = function(e) {
  toggleMenuBox()
}

// add popup
// Create a popup, but don't add it to the map yet.
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});


map.on('click', 'geo_incidents', async function(e) {
  menubox.innerHTML = ''
  var coordinates = e.features[0].geometry.coordinates.slice();
  var properties = e.features[0].properties
  var link = properties.links
  var description = 'غير موثق';
  if (properties.tweet_id) {
    loader.style = "display: block;"

    twttr.widgets.createTweet(properties.tweet_id, menubox)
      .then(() => {
        loader.style = "display: none;"
        if (!menuBoxShow) {
          toggleMenuBox()
        }
      })
  } else {
    if (link !== "null") {
      description = `<a target=_blank href=${link}>رابط</a>`
    }
    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(coordinates)
      .setHTML(description)
      .addTo(map);
  }
})

map.on('mouseenter', 'geo_incidents', function(e) {
  // Change the cursor style as a UI indicator.
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'geo_incidents', function() {
  map.getCanvas().style.cursor = '';
});

