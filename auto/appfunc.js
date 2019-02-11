// ____  __  __  _  _   ___       __    ____  ____
// ( ___)(  )(  )( \( ) / __) ___ (  )  (_  _)(  _ \
// )__)  )(__)(  )  ( ( (__ (___) )(__  _)(_  ) _ <
// (__)  (______)(_)\_) \___)     (____)(____)(____/
//
// --> Style Guide --> https://github.com/airbnb/javascript
//
'use strict'
// app library functions:
const _lowDB = require('./applowdb.js');

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

  getWebPhotos: async function(photoPath) {

    // get photos
    const photos = await globby([photoPath]);
    console.log('number of photos found: ', photos.length)

    for (let photo of photos) {

      let objPhotoPath = path.parse(photo);

      // get DB keyVal
      let photoKey = getKeyValue(objPhotoPath);

      let photoData = _lowDB.getPhoto(photoKey);

      console.log('Photo object: ', photoData);
      //console.log('???Does photo Key EXIST in DB: ', _lowDB.photoExist(photoKey))

    }
  },

  getMetaInfo: async function(albumPath) {

    let n = 0;

    // log show EXIF tool version:
    let exifVersion = await exiftool.version();
    console.info('exif tool version: ', exifVersion);

    // get photos
    const photos = await globby([albumPath]);
    console.log('number of photos found: ', photos.length)

    for (let photo of photos) {


      // Get all PHOTO EXIF DATA
      const photoExif = await exiftool.read(photo, '-fast');

      let objPhotoPath = path.parse(photo);
      let photoKey = getKeyValue(objPhotoPath);
      // let outPath = fmtPhotoPath(photo);
      // console.log('new out path: ', outPath)

      console.info(++n, ' photo: ', path.basename(photo))

      const photoObj = {
        album: _.camelCase(photoAlbum),
        key: _.camelCase(photoKey),
        name: _.camelCase(photoName),
        ext: objPhotoPath.ext,
        type: photoExif.FileType,
        mime: photoExif.MIMEType,
        absdir: photoExif.Directory,
        inPath: photo,
        // s3Path: {
        //   "path1": outPath
        // },
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
      photoObj.DTcirca = moment(photoObj.DTepoch).format('LLLL');

      // Serialize obj into lowDB!
      let pObj = _.merge({}, photoObj); //, dtObj, photoExif);
      await _lowDB.upsert(pObj);

    }

    console.log('done with all photos');
    exiftool.end();
  }

}

// Helper Functions:
function getKeyValue(objPath) {

  let regex = /_[A-Z][A-Z]$/g;
  let photoName = objPath.name;
  // strip _XX from photoName for primary key
  if (photoName.match(regex)) {
    photoName = photoName.replace(regex, '');
  }

  let photoDir = objPath.dir;
  let photoAlbum = getAlbumName(objPath.dir);

  let photoKey = photoAlbum + photoName;

  return photoKey;
}


// function fmtPhotoPath(inPath) {
//
//   let oPath = path.parse(inPath);
//   oPath.dir = oPath.dir.replace('PhotoLib', 'PhotoOut');
//
//   // note: only one layer from ALBUM directory thus no subdirectories.
//   let endAlbums = oPath.dir.lastIndexOf('albums') + 7
//   let albumName = oPath.dir.substring(endAlbums, oPath.dir.length);
//   let cmlPart = _.camelCase(albumName);
//   oPath.dir = oPath.dir.replace(albumName, cmlPart);
//
//   oPath.base = _.camelCase(oPath.name) + oPath.ext;
//
//   return path.format(oPath);
//
// }

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

  // console.log('HERE ARE THE DATES: ', dObj, '\n')
  let dtLow = new Date();
  let mDT = dtLow;

  _.forIn(dObj, function(val, key) {

    mDT = moment(val);
    if (!isNaN(mDT) && mDT < dtLow) {
      dtLow = mDT;
      // console.log('down date: ', dtLow, ' vs. ', mDT)
    }

  })

  return moment(dtLow).unix();
}

function getAlbumName(pDir) {

  let aPath = pDir.split(path.sep);
  return aPath[aPath.length-1];

}
