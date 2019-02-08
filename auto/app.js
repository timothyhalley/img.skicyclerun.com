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
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';
const AWSTable = 'Photos';

console.log('... getting all photos and album info ...');

(async () => {

  try {

    await _lowDB.dbInit();

    // let globPath = baseDir + subDirPath + imgItems;
    // await _f.getMetaInfo(globPath);
    // let albums = await _lowDB.getAlbums();
    // await _fim.processAlbums(albums);

    //AWS dynamoDB work
    await _awsDB.genTable(AWSTable);
    await _awsDB.loadData(AWSTable);

    //AWS S3 work
    // await _awsDB.copyS3(AWSTable);


  } catch (e) {
    console.error('ERROR: ', e);
  }

})();
