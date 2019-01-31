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

      let outPath = fmtPhotoPath(photo);
      console.log('new out path: ', outPath)


      const photoObj = {
        album: _.camelCase(photoAlbum),
        key: _.camelCase(photoAlbum + path.basename(photo)),
        name: _.camelCase(path.basename(photo)),
        ext: path.extname(photo),
        type: photoExif.FileType,
        mime: photoExif.MIMEType,
        dir: path.dirname(photo),
        outDir: _.camelCase(path.dirname(photo)),
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

//// Helper Functions:
function fmtPhotoPath(inPath) {

  // // create output pathObj
  // let objPath = photo.split(path.sep);
  // console.log('objPath ', objPath, '\nLENGTH', objPath.length)
  // let newPath = null;
  // let xP = false;
  // let iLen = objPath.length;
  // for (let i = 1; i <= iLen; ++i) {
  //   tokPath = objPath.shift();
  //   if (i == 1) {
  //     newPath = tokPath;
  //   } else {
  //     newPath = newPath + path.sep + tokPath;
  //   }
  // }
  // console.log('old new PATH == \n', photo, '\n', newPath);

  let oPath = path.parse(inPath);
  oPath.dir = oPath.dir.replace('PhotoLib', 'PhotoOut');

  // note: only one layer from ALBUM directory thus no subdirectories.
  let endAlbums = oPath.dir.lastIndexOf('albums') + 7
  let albumName = oPath.dir.substring(endAlbums, oPath.dir.length);
  let cmlPart = _.camelCase(albumName);
  console.log('camel this: ', cmlPart, ' with this ', albumName)

  oPath.dir = oPath.dir.replace(albumName, cmlPart);
  console.log('New directory: ', oPath.dir)

  return path.format(oPath);

  //let nPath = path.normalize(oPath.dir) // .split(path.sep).slice(-1)//[0];

  //lastPath = lastPath + _.camelCase(lastDir) + path.sep + _.camelCase(photoName);

  //console.log('this is the last directory name: ', outPath)
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
      // console.log('down date: ', dtLow, ' vs. ', mDT)
    }

  })

  return moment(dtLow).unix();
}

function getAlbumName(pathOf1Photo) {

  var albumPath = path.dirname(pathOf1Photo);
  var valStart = albumPath.lastIndexOf('/') + 1;
  var valEnd = albumPath.length;
  var albumName = albumPath.substring(valStart, valEnd);
  return albumName;
}
