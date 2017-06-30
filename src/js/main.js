import mapboxgl from 'mapbox-gl';
import {read} from './readFile'
const parse = require('csv-parse/lib/sync')

mapboxgl.accessToken = 'pk.eyJ1Ijoic2hvcnRkaXYiLCJhIjoiY2l3OGc5YmE5MDJzZjJ5bWhkdDZieGdzcSJ9.1z-swTWtcCHYI_RawDJCEw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [-87.623177, 41.881832],
  zoom: 12
})

function getStations() {
  return new Promise((resolve, reject) => {
    read().then((response) => {
      let object = parse(response, {columns: true})
      let geoStations = []
      object.forEach((station) => {
        let latlng = station.Location.substr(1, station.Location.length - 2).split(',')
        let lnglat = parseInt(latlng[1]) + ", " + parseInt(latlng[0])
        geoStations.push(
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(latlng[1]), parseFloat(latlng[0])]
            },
            properties: {}
          }
        )
      })
     resolve(geoStations)
    })
  })
}

getStations().then((stations)=>{
  map.on('load', () => {
    map.addSource('stations', {type: 'geojson', data: { type: "FeatureCollection", features: stations}})
    map.addLayer({
      id: "points",
      type: "symbol",
      source: 'stations',
      layout: {
        "icon-image": "bicycle-15",
        "text-field": "{title}",
        "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        "text-offset": [0, 0.6],
        "text-anchor": "top"
      }
    })
  })
})





