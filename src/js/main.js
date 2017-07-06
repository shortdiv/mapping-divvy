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
            properties: {
              iconSize: [40, 40]
            }
          }
        )
      })
      resolve({
        type: "FeatureCollection",
        features: geoStations
      })
    })
  })
}

getStations().then((stations) => {
  map.on('load', () => {
    debugger;
    var markerHeight = 50, markerRadius = 10, linearOffset = 25;

    stations.features.forEach((station) => {
    var el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(https://placekitten.com/g/' + station.properties.iconSize.join('/') + '/)';
    el.style.width = station.properties.iconSize[0] + 'px';
    el.style.height = station.properties.iconSize[1] + 'px';
      new mapboxgl.Marker(el)
        .setLngLat(station.geometry.coordinates)
        .addTo(map)
    })
    //map.addSource('stations', {type: 'geojson', data: { type: "FeatureCollection", features: stations}})
    //map.addLayer({
    //  id: "points",
    //  type: "symbol",
    //  source: 'stations',
    //  layout: {
    //    "icon-image": "marker-15",
    //    "text-field": "{title}",
    //    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    //    "text-offset": [0, 0.6],
    //    "text-anchor": "top"
    //  }
    //})
    //map.on('click', () => {

    //})
  })
})





