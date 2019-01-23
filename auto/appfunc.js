// ____  __  __  _  _   ___       __    ____  ____
// ( ___)(  )(  )( \( ) / __) ___ (  )  (_  _)(  _ \
// )__)  )(__)(  )  ( ( (__ (___) )(__  _)(_  ) _ <
// (__)  (______)(_)\_) \___)     (____)(____)(____/
//
// --> Style Guide --> https://github.com/airbnb/javascript
//
'use strict'

// app library functions:
const _fdb = require('./appdb.js');


const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const globby = require('globby');

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

      console.info(++n, ' photo: ', path.basename(photo))

      // Get all PHOTO EXIF DATA
      const photoExif = await exiftool.read(photo, '-fast');

      let photoName = path.basename(photo);
      let photoDir = path.dirname(photo);
      let photoAlbum = getAlbumName(photo);
      let photoKey = photoAlbum + '-' + photoName;

      const photoObj = {
        album: getAlbumName(photo),
        key: _.camelCase(getAlbumName(photo) + path.basename(photo)),
        name: path.basename(photo),
        ext: path.extname(photo),
        type: photoExif.FileType,
        mime: photoExif.MIMEType,
        dir: path.dirname(photo),
        directory: photoExif.Directory,
        DTepoch: null,
        DTcirca: null,
        address0: null,
        address1: null,
        timeZone: null,
        GPSPosition: null,
        GPSLatitude: null,
        GPSLongitude: null,
        origSize: photoExif.ImageSize,
        origWidth: photoExif.ImageWidth,
        origHeight: photoExif.ImageHeight,
        origBtyes: photoExif.FileSize
      }

      // insert check if already exist in DB.JSON
      let addPhoto = _fdb.photoExist(photoObj.key);
      if (addPhoto) {

        // Get GPS info if exist
        // console.debug('EXIF Data: \n', photoExif) //DUMP EXIF INFO TO CONSOLE!
        if (typeof(photoExif.GPSPosition) != 'undefined') {

          // Google Maps DMS2DEC
          photoObj.GPSLatitude = photoExif.GPSLatitude;
          photoObj.GPSLongitude = photoExif.GPSLongitude;

          let gurl = gMapURL + photoExif.GPSLatitude + ', ' + photoExif.GPSLongitude + '&key=' + gMapApiKey
          let gres = await r2(gurl).json;
          //console.log('return URL from gAPI: \n', gres); //gres.results[0].formatted_address, '\n', gres.results[1].formatted_address, '\n', gres.results[2].formatted_address)
          try {
            if (gres != null) {
              if (typeof gres.results[0].formatted_address !== 'undefined') {
                photoObj.address0 = gres.results[0].formatted_address;
              }
              if (typeof gres.results[1].formatted_address !== 'undefined') {
                photoObj.address1 = gres.results[1].formatted_address;
              }
            }
          } catch (error) {
            console.log('Error: ', error, '\n\nURL from gAPI: \n', gres); //gres.results[0].formatted_address, '\n', gres.results[1].formatted_address, '\n', gres.results[2].formatted_address)
          }
          photoObj.timeZone = geoTz(photoExif.GPSLatitude, photoExif.GPSLongitude);

          photoObj.GPSPosition = photoExif.GPSPosition;
          console.log(' position --> ', photoObj.GPSPosition)

        } else {
          console.log(' warning --> no GPS information...')
        }

        // get Dates for Photo
        let dtObj = getPhotoDate(photoExif);
        photoObj.DTepoch = getOriginDate(dtObj);
        photoObj.DTcirca = moment(photoObj.DTepoc).format('LLLL');

        // Serialize obj into lowDB!
        let pObj = _.merge({}, photoObj); //, dtObj, photoExif);
        await _fdb.upsert(pObj);

      }

    }

    console.log('done with all photos');
    exiftool.end();
  }

}

//// Helper Functions:
function getPhotoDate(exif) {

  const dObj = {

    OriginDate: null,
    FileModifyDate: new Date(exif.FileModifyDate),
    FileAccessDate: new Date(exif.FileAccessDate),
    FileInodeChangeDate: new Date(exif.FileInodeChangeDate),
    ModifyDate: new Date(exif.ModifyDate),
    DateTimeOriginal: new Date(exif.DateTimeOriginal),
    CreateDate: new Date(exif.CreateDate),
    DigitalCreationDate: new Date(exif.DigitalCreationDate),
    DateCreated: new Date(exif.DateCreated),
    DateTimeCreated: new Date(exif.DateTimeCreated),
    DigitalCreationDateTime: new Date(exif.DigitalCreationDateTime),
    //ProfileDateTime: new Date(exif.ProfileDateTime),
    GPSDateStamp: new Date(exif.GPSDateStamp),
    GPSDateTime: new Date(exif.GPSDateTime),
    SubSecCreateDate: new Date(exif.SubSecCreateDate),
    SubSecDateTimeOriginal: new Date(exif.SubSecDateTimeOriginal)
  }

  //console.log('will you be my Date: ', dObj)
  return dObj
}

function getOriginDate(dObj) {

  let dtSetVal = new Date();
  _.forIn(dObj, function(val, key) {
    if (key.includes('DateTime') && val < dtSetVal) {
      dtSetVal = moment(val).format('x');
    }
  })

  return dtSetVal;
}

function getAlbumName(pathOf1Photo) {

  var albumPath = path.dirname(pathOf1Photo);
  var valStart = albumPath.lastIndexOf('/') + 1;
  var valEnd = albumPath.length;
  var albumName = albumPath.substring(valStart, valEnd);
  return albumName;
}
