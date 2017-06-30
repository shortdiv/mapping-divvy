var webpack = require("webpack"),
    path = require("path");

module.exports = {
  entry: './src/js/main.js',
  output: {
    filename: './dist/js/main.js'
  },
  node: {
    fs: "empty"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
}
