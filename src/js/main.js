import mapboxgl from 'mapbox-gl';
import { fetchCSV, fetchURL } from './readFile'
import polylabel from 'polylabel';
const turf = require('@turf/inside')
const parse = require('csv-parse/lib/sync')

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvcnRkaXYiLCJhIjoiY2l3OGc5YmE5MDJzZjJ5bWhkdDZieGdzcSJ9.1z-swTWtcCHYI_RawDJCEw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-87.623177, 41.881832],
  zoom: 12
})

const mapEl = document.getElementById('map')
const overlayEl = document.getElementById('map-filter-overlay')
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});

function makeNeighborhood(name) {
  var parser = new DOMParser
  var content = '<a href="#">' + name + '</a>'
  var snippet = parser.parseFromString(content, 'text/html').body.children[0]
  return snippet
}

function getStations() {
  return fetchCSV().then((response) => {
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
      return({
        type: "FeatureCollection",
        features: geoStations
      })
    })
}

function getNeighborhoods() {
  return fetchURL('/data/chicago_neighborhoods.geojson')
    .then(response => {
      return response
    })
}

Promise.all([getStations(), getNeighborhoods()])
  .then(values => {

  map.on('load', () => {
    map.addSource('stations', { type: 'geojson', data: values[0] })
    map.addSource('neighborhoods', { type: 'geojson', data: values[1] })
        let filter = document.createElement('div')
        filter.className += 'neighborhood-list'
        values[1].features.forEach(feature => {
          var stationsArray = []
          values[0].features.forEach(station => {
          //var isInside = turf(station.geometry.coordinates, feature.geometry.coordinates)
          //var bike = turf.point(station.geometry.coordinates)
          //var hood = turf.polygon(feature.geometry.coordinates)
          //var isInside = turf.inside(bike, hood);
          //isInside ? stationsArray.push(station) : ''
          })
          let neighborhood = feature.properties.PRI_NEIGH;
          let elem = makeNeighborhood(neighborhood)

          elem.addEventListener('click', (e) => {
            var t = polylabel(feature.geometry.coordinates, 1.0)
            popup
              .setLngLat(t)
              .setHTML(e.target.innerText)
              .addTo(map)
            map.panTo(t)
            map.setFilter("neighborhoods-selected", ["==", "PRI_NEIGH", e.target.innerText]);
          })
          filter.appendChild(elem)
          })
        overlayEl.appendChild(filter)


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

    //all neighborhoods related events//
    map.on('click', 'neighborhoods-fill', (e) => {
      map.panTo(e.lngLat);
      map.setFilter("neighborhoods-selected", ["==", "PRI_NEIGH", e.features[0].properties.PRI_NEIGH]);
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
})






