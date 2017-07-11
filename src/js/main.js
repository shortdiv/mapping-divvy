import mapboxgl from 'mapbox-gl';
import { fetchCSV, fetchURL } from './readFile'
import polylabel from 'polylabel';
const parse = require('csv-parse/lib/sync')

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvcnRkaXYiLCJhIjoiY2l3OGc5YmE5MDJzZjJ5bWhkdDZieGdzcSJ9.1z-swTWtcCHYI_RawDJCEw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-87.623177, 41.881832],
  zoom: 12
})

const mapEl = document.querySelector('#map')
let filter = document.createElement('select')
filter.className += 'filter'

function makeNeighborhood(name) {
  var parser = new DOMParser
  var content = '<option value ="' + name + '">' + name + '</option>'
  var snippet = parser.parseFromString(content, 'text/html').body.children[0]
  return snippet
}

    fetchURL('/data/chicago_neighborhoods.geojson').then((response) => {
      response.features.forEach((feature) => {
        let neighborhood = feature.properties.PRI_NEIGH;
        filter.appendChild(makeNeighborhood(neighborhood))
      })
      mapEl.appendChild(filter)
    })

function getStations() {
  return new Promise((resolve, reject) => {
    fetchCSV().then((response) => {
      let object = parse(response, {columns: true})
      let geoStations = []
      object.forEach((station) => {
        let latlng = station.Location.substr(1, station.Location.length - 2).split(',')
        let lnglat = parseInt(latlng[1]) + ", " + parseInt(latlng[0])
        let stationName = station["Station Name"]
        let stats = station["Status"]
        let docks = station["Total Docks"]
        //filter.appendChild(makeStation(station))
        geoStations.push(
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(latlng[1]), parseFloat(latlng[0])]
            },
            properties: {
              stationName: stationName,
              docks: docks
            }
          }
        )
      })
      //mapEl.appendChild(filter)
      resolve({
        type: "FeatureCollection",
        features: geoStations
      })
    })
  })
}

getStations().then((stations) => {
  map.on('load', () => {
    map.addSource('stations', { type: 'geojson', data: stations })
    map.addSource('neighborhoods', { type: 'geojson', data: '/data/chicago_neighborhoods.geojson' })

    map.addLayer({
      "id": "neighborhoods-fill",
      "type": "fill",
      "source": "neighborhoods",
      "layout": {},
      "paint": {
        "fill-color": "#b3d5ed",
        "fill-opacity": 0.47
      },
      filter: ["!=", "PRI_NEIGH", ""]
    }, 'stations')

    map.addLayer({
      "id": "neighborhoods-borders",
      "type": "line",
      "source": "neighborhoods",
      "layout": {},
      "paint": {
        "line-color": "#ad0403",
        "line-width": 2
      },
      filter: ["!=", "PRI_NEIGH", ""]
    })
    map.addLayer({
      id: "neighborhoods-hover",
      type: "fill",
      source: "neighborhoods",
      layout: {},
      paint: {
        "fill-color": "#b3d5ed",
        "fill-opacity": 0.6
      },
      filter: ["==", "PRI_NEIGH", ""]
    })
    map.addLayer({
      id: "neighborhoods-selected",
      type: "fill",
      source: "neighborhoods",
      layout: {},
      paint: {
        "fill-color": "#000",
        "fill-opacity": 0.4
      },
      filter: ["==", "PRI_NEIGH", ""]
    })
    map.addLayer({
      "id": "stations",
      "type": "symbol",
      "source": "stations",
    layout: {
      "icon-image": "marker-15",
      "text-field": "{title}",
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-offset": [0, 0.6],
      "text-anchor": "top"
    }
    })

     var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    //all neighborhoods related events//
    map.on('click', 'neighborhoods-fill', (e) => {
      var element = document.querySelector('.filter')
      element.value = e.features[0].properties.PRI_NEIGH
      var event = new Event('change');
      element.dispatchEvent(event)
    })
    map.on('mousemove', 'neighborhoods-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer'
      //if selected dont change color//
      map.setFilter("neighborhoods-hover", ["==", "PRI_NEIGH", e.features[0].properties.PRI_NEIGH]);
      //polylabel only works for single dimensional arrays i.e. not ohare and not streeterville//
      var t = polylabel(e.features[0].geometry.coordinates, 1.0)
      popup
        .setLngLat(t)
        .setHTML(e.features[0].properties.PRI_NEIGH)
        .addTo(map)
    })
    map.on('mouseleave', 'neighborhoods-fill', (e) => {
      map.getCanvas().style.cursor = ''
      map.setFilter("neighborhoods-hover", ["==", "PRI_NEIGH", ""]);
      popup.remove()
    })

    //all station related events//
    map.on('mouseenter', 'stations', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'stations', () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('click', 'stations', (e) => {
      var content = "<h1>"+e.features[0].properties.stationName + "</h1>" + "<p>Total Docks: " + e.features[0].properties.docks + "</p>"
      new mapboxgl.Popup()
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(content)
        .addTo(map);
    })
  })

  filter.addEventListener('change', (e) => {
    console.log(e.target.value)
    map.setFilter("neighborhoods-selected", ["==", "PRI_NEIGH", e.target.value]);
    //map.setLayoutProperty(e.target.value, 'visibility', 'visible');
  })

})





