'use strict'
// ____  __  __  _  _   ___       __    ____  ____
// ( ___)(  )(  )( \( ) / __) ___ (  )  (_  _)(  _ \
// )__)  )(__)(  )  ( ( (__ (___) )(__  _)(_  ) _ <
// (__)  (______)(_)\_) \___)     (____)(____)(____/
//
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const _fdb = require('./appdb_func.js');
const _ = require('lodash')

// google API
var keyStore = JSON.parse(fs.readFileSync('./key.json'));
const gMapApiKey = keyStore.googleAPI.key;
const gMapURL = keyStore.googleAPI.url;
const gMap = require('@google/maps').createClient({
  key: gMapApiKey,
  Promise: Promise
});
const exif = require('exiftool');
const dms2dec = require('dms2dec');
const r2 = require("r2");
const moment = require('moment');
const geoTz = require('geo-tz');

module.exports = {

  getMetaInfo: async function(albumPath) {

    let n = 0;
    const photos = await globby(albumPath);

    await photos.forEach(async photo => {

      console.info(n++, ' getAllPhotos on photo: ', path.basename(photo))

      let photoName = path.basename(photo);
      let photoDir = path.dirname(photo);
      let photoAlbum = getAlbumName(photo);
      var photoKey = photoAlbum + '-' + photoName;
      var pObj = null;

      const photoObj = {
        key: photoKey,
        name: photoName,
        dir: photoDir,
        album: photoAlbum
      }

      fs.readFile(photo, function(err, data) {
        if (err)
          throw err;
        else {
          exif.metadata(data, function(err, metadata) {
            if (err)
              throw err;
            else
              pObj = _.merge({}, photoObj, metadata)
              _fdb.upsert(pObj);
          });
        }
      });

    })
  },

  getGeoInfo: async function() {
    
  },

  oldMetaVersion: async function(albumPath) {

      try {

        let n = 0;
        const photos = await globby(albumPath);
        await photos.forEach(async photo => {

          console.info(n++, ' getAllPhotos on photo: ', path.basename(photo))

          let photoName = path.basename(photo);
          let photoDir = path.dirname(photo);
          let photoAlbum = getAlbumName(photo);
          var photoKey = photoAlbum + '-' + photoName;

          const photoObj = {
            key: photoKey,
            name: photoName,
            dir: photoDir,
            album: photoAlbum,
            geoinfo: {
              location: null,
              dec: null,
              lat: null,
              lon: null,
              gmt: null,
              alt: null
            },
            dateinfo: {
              dt: null,
              dto: null,
              dtz: null,
              tz: null,
            }
          };

          let exifData = await getExifInfo(photo);

          // setup dates for WM & cron order
          if (typeof(exifData.exif) != 'undefined') {
            photoObj.dateinfo.dto = exifData.exif.DateTimeOriginal;

            photoObj.dateinfo.dt = moment(photoObj.dateinfo.dto).format("dddd, MMMM do YYYY, h:mm:ss a");
            photoObj.dateinfo.dtz = fDateMoment(photoObj.dateinfo.dto);
            if (photoObj.dateinfo.dtz == 'Invalid date') {
              photoObj.dateinfo.dtz = '00000000_0000' + fRandomNumber(1, 100).toString();
            };
          };

          // Get GPS info if exist
          if (typeof(exifData.gps) != 'undefined') {
            let gpsLatLon = await dms2dec(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef, exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef);
            let latlng = await JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
            let gurl = await gMapURL + latlng + '&key=' + gMapApiKey
            let gres = await r2(gurl).json;

            photoObj.geoinfo.location = await gres.results[0].formatted_address;
            photoObj.geoinfo.dec = latlng;
            photoObj.geoinfo.lat = JSON.stringify(gpsLatLon[0]);
            photoObj.geoinfo.lon = JSON.stringify(gpsLatLon[1]);
            photoObj.geoinfo.alt = exifData.gps.GPSAltitude;
            photoObj.geoinfo.gmt = exifData.gps.GPSTimeStamp;

            photoObj.dateinfo.tz = geoTz(photoObj.geoinfo.lat, photoObj.geoinfo.lon);
                //console.log('Photo: ', photo, ' ... is located here -->\n', photoGeo)
          }

          console.log('object check: ', photoObj);
          _fdb.upsert(photoObj);

        });
      } catch (e) {
        console.error('ERROR: ', e);
      };

    },

    photoWorks: async function() {

      try {
          let thissize = _fdb.dbsize('photos');
          console.log('this is size: ', thissize)
          let photos = _fdb.getAlbumPhotos('photos')
          console.log('my photos? ', photos)
          photos.forEach(photo => {
            console.log('calling photo bomb: ', photo.key)
          })

        }
      catch (e) {
        console.error('ERROR: ', e);
      }
    }

}

//// Helper Functions:

function getAlbumName(pathOf1Photo) {

  var albumPath = path.dirname(pathOf1Photo);
  var valStart = albumPath.lastIndexOf('/') + 1;
  var valEnd = albumPath.length;
  var albumName = albumPath.substring(valStart, valEnd);
  return albumName;
}

function getExifInfo(file) {
  return new Promise(resolve => {
    exif.read(file)
      .then(resolve)
      .catch(console.log)
  });
}

function fDateMoment(cDT) {

  var chronDT;

  if (!moment(cDT, 'YYYY:MM:DD HH:mm:ss').isValid()) {

    const min = 100000;
    const max = 235959;
    var s = Math.floor(Math.random() * (max - min + 1)) + min;
    //chronDT = '20150905_' + s
    chronDT = '00000000_' + s;

  } else {

    chronDT = moment(cDT, 'YYYY:MM:DD HH:mm:ss', true).format('YYYYMMDD_HHmmss')

  }

  return chronDT

}
