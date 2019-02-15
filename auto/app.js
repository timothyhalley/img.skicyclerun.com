'use strict'
// app library functions:
const _f = require('./appfunc.js');
const _lowDB = require('./applowdb.js');
const _awsDB = require('./appawsdb.js');
const _fim = require('./appimage.js');

// Node core:
const path = require('path');

// Addon Node modules:
const globby = require('globby');

// PhotoLib locations and item search
const baseDir = '../../../skicyclerun/PhotoLib/';
const outDir = '../../../skicyclerun/PhotoOut/';
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';
const ALBUMPHOTOS = baseDir + subDirPath + imgItems;
const S3PHOTOS = outDir + subDirPath + imgItems;
const AWSTable = 'Photos';

console.log('... getting all photos and album info ...');

(async () => {

  try {

    // Source albums & photos
    await _lowDB.dbInit();
    await _f.getMetaInfo(ALBUMPHOTOS);
    //
    // Generate images for web style
    let albums = await _lowDB.getAlbums();
    await _fim.processAlbums(albums);

    // Gather all images into local db
    await _f.getWebPhotos(S3PHOTOS);

    //AWS dynamoDB work
    await _awsDB.genTable(AWSTable);
    await _awsDB.loadData(AWSTable);

    //AWS S3 work
    await _awsDB.copyS3(AWSTable);

  } catch (e) {
    console.error('ERROR: ', e);
  }

})();
