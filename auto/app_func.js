'use strict'
const path = require('path');
const globby = require('globby');

module.exports = {

  getAllPhotos: function(albumPath) {
    // const paths = await globby(albumPath);
    // //console.log('paths:', paths)

    let p = new Promise((resolve,reject) => {
       // do some async task
       resolve(globby(albumPath));
    });

    return p.then(data => data)
  },

  getAlbum: function(pathOf1Photo) {

    var albumPath = path.dirname(pathOf1Photo);
    var valStart = albumPath.lastIndexOf('/') + 1;
    var valEnd = albumPath.length;
    var album = albumPath.substring(valStart, valEnd);
    return album
  },

  returnTrue: async function() {

    // create a new promise inside of the async function
    let promise = new Promise((resolve, reject) => {
      setTimeout(() => resolve('OH NOOOO'), 1000) // resolve
    });

    // wait for the promise to resolve
    try {
      await promise.then(function(value) {
        return value;
        console.log('in the promise async wait --> ', value);
      })
      //return result;
    } catch (e) {
      console.error(e)
    }

    // console log the result (true)

  }

}
