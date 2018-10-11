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


// google API
var keyStore = JSON.parse(fs.readFileSync('./key.json'));
const gMapApiKey = keyStore.googleAPI.key;
const gMapURL = keyStore.googleAPI.url;
const gMap = require('@google/maps').createClient({
  key: gMapApiKey,
  Promise: Promise
});
const exif = require('fast-exif');
const dms2dec = require('dms2dec');
const r2 = require("r2");


module.exports = {

  getAllPhotos: async function(albumPath) {

      try {
        const photos = await globby(albumPath);
        await photos.forEach(async photo => {
          var photoName = path.basename(photo);
          var photoDir = path.dirname(photo);
          var photoAlbum = getAlbumName(photo);
          var photoKey = photoAlbum + '-' + photoName;
          var photoLoc = 'Unknown Location (A)';
          var photoCDT = 'Unknown Date Time';

          let exifData = await getExifInfo(photo);
          if (typeof(exifData.gps) != 'undefined') {
            let gpsLatLon = await dms2dec(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef, exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef);
            let latlng = await JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
            let gurl = await gMapURL + latlng + '&key=' + gMapApiKey
            let gres = await r2(gurl).json;
            photoLoc = await gres.results[0].formatted_address;
            //console.log('Photo: ', photo, ' ... is located here -->\n', photoGeo)
          }
          //console.log('EXIF \n', exifData.exif.DateTimeOriginal)
          if (typeof(exifData.exif) != 'undefined') {
            var photoCDT = exifData.exif.DateTimeOriginal;
          }

          let photoObj = {
            key: photoKey,
            name: photoName,
            dir: photoDir,
            album: photoAlbum,
            geo: photoLoc,
            cdt: photoCDT
          }

          _fdb.upsert(photoObj);

        });
      } catch (e) {
        console.error('ERROR: ', e);
      };
    },

    getGeoLocation: async function(albumPath) {

      try {
        const photos = await globby(albumPath);
        await photos.forEach(async photo => {
          let exifData = await getExifInfo(photo);
          if (typeof(exifData.gps) != 'undefined') {
            let gpsLatLon = await dms2dec(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef, exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef);
            let latlng = await JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
            let gurl = await gMapURL + latlng + '&key=' + gMapApiKey
            let gres = await r2(gurl).json;
            let geoAddr = await gres.results[0].formatted_address;
            console.log('Photo: ', photo, ' ... is located here -->\n', geoAddr)
          } else {
            return 'Unknown Location';
          }
          _fdb.upsert(photo);
        });
      } catch (e) {
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
