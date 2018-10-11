'use strict'
const _f = require('./app_func.js');

// NODE: lowDB library
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)

// Node core:
const path = require('path');

module.exports = {

  dbInit: function() {
    db.defaults({
        photos: []
      })
      .write()
  },

  upsert: function(photoObj) {

    db.get('photos')
      .upsert({
        key: photoObj.key,
        file: photoObj.name,
        directory: photoObj.dir,
        album: photoObj.album,
        geoLoc: photoObj.geo,
        datetime: photoObj.cdt
      })
      .write()
  }

}
//LowDB lodash function library:
db._.mixin({
  upsert: function(collection, obj, key) {
    key = key || 'key';
    for (var i = 0; i < collection.length; i++) {
      var el = collection[i];
      if(el[key] === obj[key]){
        collection[i] = obj;
        return collection;
      }
    };
    collection.push(obj);
  }
});
