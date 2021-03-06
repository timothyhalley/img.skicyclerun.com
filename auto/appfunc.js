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
const nanoid = require('nanoid');

// google API
//https://developers.google.com/maps/documentation/geocoding/start
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

  cleanLowDB: async function(photoPath) {

    // get photos
    const photos = await globby([photoPath]);
    console.log('Cleaning photos in DB: ', photos.length)

    for (let photo of photos) {

      let objPhotoPath = path.parse(photo);

      // get DB keyVal
      // console.debug('ojb Photo Path: ', getKeyValue(objPhotoPath))
      const photoKey = getKeyValue(objPhotoPath);

      if (_lowDB.photoExist(photoKey)) {
        let pObj = _lowDB.getPhoto(photoKey);

        // // Generate next path# eg path0 + 1, path1 + 1 etc...
        // let pKey = 'path' + Object.keys(pObj.s3Path).length

        pObj.s3Path = {};
        await _lowDB.upsert(pObj);

      }

    }
  },

  getWebPhotos: async function(photoPath) {

    // get photos
    const photos = await globby([photoPath]);
    console.log('number of photos found: ', photos.length)

    for (let photo of photos) {

      let objPhotoPath = path.parse(photo);

      // get DB keyVal
      // console.debug('ojb Photo Path: ', getKeyValue(objPhotoPath))
      const photoKey = getKeyValue(objPhotoPath);

      if (_lowDB.photoExist(photoKey)) {
        let pObj = _lowDB.getPhoto(photoKey);

        // Generate next path# eg path0 + 1, path1 + 1 etc...
        let pKey = 'path' + Object.keys(pObj.s3Path).length

        pObj.s3Path[pKey] = photo;
        await _lowDB.upsert(pObj);

      }

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
      let photoAlbum = getAlbumName(objPhotoPath.dir);
      let photoName = getPhotoName(objPhotoPath)
      //let outPath = fmtPhotoPath(photo);
      // console.log('new out path: ', outPath)

      console.info(++n, ' photo: ', path.basename(photo))

      const photoObj = {
        key: nanoid(8),
        album: _.camelCase(photoAlbum),
        pKey: _.camelCase(photoKey),
        name: _.camelCase(photoName),
        ext: objPhotoPath.ext,
        type: photoExif.FileType,
        mime: photoExif.MIMEType,
        absdir: photoExif.Directory,
        inPath: photo,
        s3Path: {},
        DTepoch: null,
        DTcirca: null,
        timeZone: null,
        GPSPosition: null,
        GPSLatitude: null,
        GPSLongitude: null,
        origSize: photoExif.ImageSize,
        origWidth: photoExif.ImageWidth,
        origHeight: photoExif.ImageHeight,
        origBtyes: photoExif.FileSize,
        address: {}
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

            if (gres.status == 'OK') {

              for (let i = 0; i < gres.results.length; i++ ) {
                  let addLoc = null;
                  let addLen = 0;
                  if (typeof gres.results[i].formatted_address !== 'undefined') {
                    addLoc = gres.results[i].formatted_address;
                    addLen = gres.results[i].formatted_address.length;
                  } else {
                    addLoc = gres.plus_code.compound_code;
                    addLoc = gres.plus_code.compound_code;
                    addLoc = addLoc.substring(addLoc.indexOf(' ')+1, addLoc.length);
                  }

                // Generate next address# etc...
                let pKey = 'address' + Object.keys(photoObj.address).length
                photoObj.address[pKey] = addLoc;

              }
            } else if (gres.status == 'ZERO_RESULTS') {

                let locCode = gres.plus_code.compound_code;
                locCode = locCode.substring(locCode.indexOf(' ')+1, locCode.length)

                let pKey = 'address' + Object.keys(photoObj.address).length
                photoObj.address[pKey] = locCode;
            } else {
              console.log('ERROR --> GAPI: ', gres)
              photoObj.address = 'UNKNOWN LOCATION'
            }

          }
        } catch (error) {
          console.log('Error: ', error);
        }

        photoObj.timeZone = geoTz(photoExif.GPSLatitude, photoExif.GPSLongitude);
        // console.debug('TIME ZONE: ', photoObj.timeZone)
        photoObj.GPSPosition = photoExif.GPSPosition;
        // console.debug(' position --> ', photoObj.GPSPosition)

      } else {
        console.error(' warning --> no GPS information...')
      }

      // get Dates for Photo
      let dtObj = getPhotoDate(photoExif);
      let dtCirca = getOriginDate(dtObj);
      photoObj.DTcirca = moment(dtCirca).format('LLLL');
      //console.log('DATE WHAT HAPPENED: ', dtObj, '  vs  ', moment(photoObj.DTepoch).format('LLLL'))
      photoObj.DTepoch = moment(dtCirca).unix();

      // Serialize obj into lowDB!
      let pObj = _.merge({}, photoObj); //, dtObj, photoExif);
      await _lowDB.upsert(pObj);

    }

    console.log('done with all photos...');
    exiftool.end();

  }

}

// Helper Functions:
function flattenDeep(arr1) {
  const result = arr1.reduce(
    (result, {
      name,
      tags
    }) => result
    .concat(tags.map(tag => ({
      name,
      ...tag
    }))),
    []
  );
  return result;
}
function flatten(input) {
  const stack = [...input];
  const res = [];
  while (stack.length) {
    // pop value from stack
    const next = stack.pop();
    if (Array.isArray(next)) {
      // push back array items, won't modify the original input
      stack.push(...next);
    } else {
      res.push(next);
    }
  }
  //reverse to restore input order
  return res.reverse();
}

function getPhotoName(objPath) {

  let regex = /_[A-Z][A-Z]$/g;
  let photoName = objPath.name;
  // strip _XX from photoName for primary key
  if (photoName.match(regex)) {
    photoName = photoName.replace(regex, '');
  }

  return photoName;
}

function getKeyValue(objPath) {

  let regex = /_[A-Z][A-Z]$/g;
  let photoName = objPath.name;
  // strip _XX from photoName for primary key
  if (photoName.match(regex)) {
    photoName = photoName.replace(regex, '');
  }
  let photoDir = objPath.dir;
  let photoAlbum = getAlbumName(objPath.dir);
  let photoKey = photoAlbum + _.capitalize(photoName.replace(' ', ''));

  return photoKey;
}

function fmtPhotoPath(inPath) {

  let oPath = path.parse(inPath);
  oPath.dir = oPath.dir.replace('PhotoLib', 'PhotoOut');

  // note: only one layer from ALBUM directory thus no subdirectories.
  let endAlbums = oPath.dir.lastIndexOf('albums') + 7
  let albumName = oPath.dir.substring(endAlbums, oPath.dir.length);
  oPath.dir = oPath.dir.replace(albumName, _.camelCase(albumName));

  oPath.base = _.camelCase(oPath.name) + oPath.ext;

  return path.format(oPath);

}

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
    }

  })

  // console.log('DATE SELECTED: ', moment(dtLow).format('LLLL'))
  //return moment(dtLow).unix();
  return dtLow;
}

function getAlbumName(pDir) {

  let aPath = pDir.split(path.sep);
  return aPath[aPath.length-1];

}
