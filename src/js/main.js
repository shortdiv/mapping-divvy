import mapboxgl from 'mapbox-gl';
import { fetchCSV, fetchURL } from './readFile'
import polylabel from 'polylabel';
const turf = require('turf-inside')
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

var stationPopup = new mapboxgl.Popup({
  closeButton: true,
  closeOnClick: false
});

function makeNeighborhood(name) {
  var parser = new DOMParser
  var content = '<a href="#">' + name + '</a>'
  var snippet = parser.parseFromString(content, 'text/html').body.children[0]
  return snippet
}

function makeStation(station) {
  var parser = new DOMParser
  var content = '<li><a href="#">' + station.properties.stationName + '</a></li>'
  var snippet = parser.parseFromString(content, 'text/html').body.children[0]
  return snippet;
}

function getStations() {
  return fetchCSV().then((response) => {
    return parse(response, {columns: true})
  })
}

/**
 * formats stations based on appropriate geojson format and flips lng/lat to fit mapbox api
 *
 * @param {object} allStations
 * @returns {object} stations as geojson
 */
function formatStations(object) {
  let geoStations = []
  object.forEach((station) => {
    let latlng = station.Location.substr(1, station.Location.length - 2).split(',')
    let lnglat = parseInt(latlng[1]) + ", " + parseInt(latlng[0])
    let stationName = station["Station Name"]
    let stats = station["Status"]
    let docks = station["Total Docks"]
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
}
function getNeighborhoods() {
  return fetchURL('/data/chicago_neighborhoods.geojson')
    .then(response => {
      return response;
    })
}

Promise.all([getStations(), getNeighborhoods()])
  .then(values => {
    const stations = formatStations(values[0])
    const neighborhoods = values[1]
    map.on('load', () => {
      map.addSource('stations', { type: 'geojson', data: stations })
      map.addSource('neighborhoods', { type: 'geojson', data: neighborhoods })
      let filter = document.createElement('ul')
      filter.className += 'neighborhood-list'
      neighborhoods.features.forEach(neighborhood => {
        var stationsInNeighborhood = []
        var frag = document.createElement('ul')
        frag.className += 'station-list'
        var neighborhoodElem = document.createElement('li')
        stations.features.forEach(station => {
          var inside = turf(station, neighborhood)
          var stationElem = inside ? makeStation(station) : null
          if(stationElem != null) {
            stationElem.childNodes[0].addEventListener('click', (e) => {
              popup.remove()
              map.panTo(station.geometry.coordinates);
              var content = "<h1>"+ station.properties.stationName + "</h1>" + "<p>Total Docks: " + station.properties.docks + "</p>"
              stationPopup.remove()
              stationPopup
                .setLngLat(station.geometry.coordinates)
                .setHTML(content)
                .addTo(map);
            })
            frag.appendChild(stationElem)
          }
        })
        let elem = makeNeighborhood(neighborhood.properties.PRI_NEIGH)
        neighborhoodElem.appendChild(elem)
        neighborhoodElem.appendChild(frag)

        elem.addEventListener('click', (e) => {
          var t = polylabel(neighborhood.geometry.coordinates, 1.0)
          stationPopup.remove()
          popup
            .setLngLat(t)
            .setHTML(e.target.innerText)
            .addTo(map)
          map.panTo(t)
          map.setFilter("neighborhoods-selected", ["==", "PRI_NEIGH", e.target.innerText]);
        })
        filter.appendChild(neighborhoodElem)
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
        id: "station-selected",
        type: "symbol",
        source: "stations",
        paint: {
          "fill-color": "#ff8888"
        },
        filter: ["==", "stationName", ""]
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
        stationPopup.remove()
        popup.remove()
        var t = polylabel(e.features[0].geometry.coordinates, 1.0)
        popup
          .setLngLat(t)
          .setHTML(e.features[0].properties.PRI_NEIGH)
          .addTo(map)
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
        stationPopup.remove()
        stationPopup
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(content)
          .addTo(map);
          //change color//
          map.setFilter("stations-selected", ["==", "stationName", e.features.properties.stationName])
      })
    })
  })






