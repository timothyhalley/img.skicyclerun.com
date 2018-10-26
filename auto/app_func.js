'use strict'
// ____  __  __  _  _   ___       __    ____  ____
// ( ___)(  )(  )( \( ) / __) ___ (  )  (_  _)(  _ \
// )__)  )(__)(  )  ( ( (__ (___) )(__  _)(_  ) _ <
// (__)  (______)(_)\_) \___)     (____)(____)(____/
//
// --> Style Guide --> https://github.com/airbnb/javascript
//
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const globby = require('globby');
const _fdb = require('./appdb_func.js');
const _ = require('lodash');


// google API
const keyStore = JSON.parse(fse.readFileSync('./key.json'));
const gMapApiKey = keyStore.googleAPI.key;
const gMapURL = keyStore.googleAPI.url;
const gMap = require('@google/maps').createClient({
  key: gMapApiKey,
  Promise: Promise
});


//const exif = require('exiftool');
const exiftool = require("exiftool-vendored").exiftool
const dms2dec = require('dms2dec');
const r2 = require('r2');
const moment = require('moment');
const geoTz = require('geo-tz');

module.exports = {

  getMetaInfo: async function(albumPath) {

    let n = 0;

    let exifVersion = await exiftool.version()
    console.info('exif tool version: ', exifVersion)
    const photos = await globby([albumPath]);
    console.log('number of photos found: ', photos.length)

    for (let photo of photos) {

      console.info(++n, ' getAllPhotos on photo: ', path.basename(photo))

      let photoName = path.basename(photo);
      let photoDir = path.dirname(photo);
      let photoAlbum = getAlbumName(photo);
      var photoKey = photoAlbum + '-' + photoName;
      //var pObj = null;

      const photoObj = {
        key: photoKey,
        name: photoName,
        dir: photoDir,
        album: photoAlbum
      }

      //const fileData = await fse.readFile(photo);
      console.log('await file read...')
      const photoExif = await exiftool.read(photo, '-fast');
      // //console.log('working on: \n', photoExif, '\n\n')
      // const dateObj = await getPhotoDate(photoExif);
      // //console.log('date OBJ: ', dateObj)
      console.log('before merge ...', photoName); // , 'EXIF Date: ', photoExif.GPSDateTime)
      let pObj = _.merge({}, photoObj, photoExif);
      console.log('before upsert ...', photoName)
      await _fdb.upsert(pObj);
      console.log('done with upsert ...', photoName);//, '\n', pObj);
      _.forIn(pObj.GPSDateTime, function(val, key) {
        console.log('itemlist: ', key, ' ', val)
      })
      // console.log('this is the key I want: ', photoObj.key)
      // await _fdb.getPhotoDate(photoObj.key, 'unk');

      // await fse.readFile(photo, function(err, data) {
      //   if (err)
      //     throw err;
      //   else {
      //     exif.metadata(data, function(err, metadata) {
      //       if (err)
      //         throw err;
      //       else {
      //         pObj = _.merge({}, photoObj, metadata)
      //         _fdb.upsert(pObj);
      //         console.log('DB upsert done')
      //       }
      //
      //     });
      //
      //   }
      // });
      //console.log('await #4', photoExif)
    }
    console.log('done with all photos');
    exiftool.end();
  },

    photoWorks: async function() {

      try {
        let thissize = _fdb.dbsize('photos');
        console.log('this is size: ', thissize)
        let photos = _fdb.getAlbumPhotos('photos')
        //console.log('my photos? ', photos)
        photos.forEach(photo => {
          console.log('calling photo bomb: ', photo.key)
        })

      } catch (e) {
        console.error('ERROR: ', e);
      }
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

    }

}

//// Helper Functions:

function getPhotoDate(exif) {

  //console.log('object KEYS ', Object.keys(exif));
  console.log('object VALUE', Object.values(exif.DateTimeOriginal))

  const dObj = {

    gpsDT: moment(exif.GPSTimeStamp),
    fileDT: moment(exif.DateTimeOriginal)
  }

  console.log('here is my date obj: ', dObj)
  return dObj
}
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

// *** references -->
//     // https://medium.com/@rafaelvidaurre/truly-understanding-async-await-491dd580500e


//
// function doubleAfter2Seconds(x) {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve(x * 2);
//     }, 2000);
//   });
// }
//
// async function addAsync(x) {
//   const a = await doubleAfter2Seconds(x);
//   const b = await doubleAfter2Seconds(a);
//   const c = await doubleAfter2Seconds(b);
//   return c;
// }
//
// async function cntImages(path) {
//   const imgItems = await globby([path]);
//   return imgItems;
// }
