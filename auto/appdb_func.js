'use strict'
const _f = require('./app_func.js');

// NODE: lowDB library
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
const _ = require('lodash');


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
    //console.log('adding photoobj to JSON', photoObj)
    db.get('photos')
      .upsert(photoObj)
      .write()

  },

  dbsize: function(album) {

    let size = db.get(album)
      .size()
      .value();

    return size;
  },

  getAlbumPhotos: function(album) {
    let photos = db.get(album).value();
    // photos.forEach(photo => {
    //   console.log('photo bomb: ', photo.key)
    // })
    return photos;
  },

  getDBNode: function(keyVal, element) {

    let dbElement = null;
    let item = db.get('photos')
                  //.find({key: node})
                  .find({key: keyVal})
                  .value();

    _.forIn(item, function(val, key) {
      if (key == element) {
        //console.log('found it: ', val);
        dbElement = val;
      }
    })
    //console.log('... uh no!')
    return dbElement

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
