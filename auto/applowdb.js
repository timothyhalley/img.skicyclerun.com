'use strict'

// LOWDB Docs & examples:
// https://www.diycode.cc/projects/typicode/lowdb
// https://github.com/typicode/lowdb/tree/master/examples
// https://devhints.io/lodash

//http://nmotw.in/lowdb/

// NODE: lowDB library
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter);

// Node core & other:
const path = require('path');

module.exports = {

  dbInit: function() {
    db.defaults({
        photos: []
      })
      .write()
  },

  getPhoto: function(photoKey) {

    let pVal = db.get('photos')

      .find({pKey: photoKey})
      .value();

    return pVal;
  },

  photoExist: function(photoKey) {

    let pData = db.get('photos')
      .find({pKey: photoKey})
      .value()

    return (photoKey == pData.pKey) ? true : false;
  },

  upsert: function(photoObj) {

    // console.log('upsert photoobj to JSON', photoObj)

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

  getAlbums: function() {

    //let photos = db.get('photos')
    let albums = db.get('photos')
      .sortBy('album')
      .map('album')
      .uniq()
      .value()
    return albums;
  },

  getAlbumPhotos: function(albumName) {

    let photos = db.get('photos')
      .filter({album: albumName, type: 'JPEG'})
      .sortBy('name')
      .value()

    return photos;
  },

  getAllPhotos: function(keyVal, element) {

    let items = db.get('photos')
                  //.find({key: node})
                  .find({album: keyVal})
                  .value();
    return items
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
