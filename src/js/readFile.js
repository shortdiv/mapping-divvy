import 'whatwg-fetch';
const parse = require('csv-parse/lib/sync')

var fetchCSV = function() {
  return new Promise(function(resolve, reject) {
    var req = new XMLHttpRequest();
    req.open('GET', 'data/Divvy_Bicycle_Stations.csv', true)
    req.onload = function() {
      if(req.status === 200) {
        resolve(req.response)
      } else {
        reject(Error(req.statusText))
      }
    }
    req.send();
  })
}

var fetchURL = function(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => {resolve(response.json())})
  })
}

export { fetchCSV, fetchURL }
