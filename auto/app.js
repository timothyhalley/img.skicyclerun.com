'use strict'
// app library functions:
const _f = require('./app_func.js');
const _fdb = require('./appdb.js');

// Node core:
const path = require('path');

// Addon Node modules:
const globby = require('globby');

// PhotoLib locations and item search
const baseDir = '../../../skicyclerun/PhotoLib/';
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';

console.log('... getting all photos and album info ...');

(async () => {

  try {

    await _fdb.dbInit();

    let globPath = baseDir + subDirPath;
    await _f.getMetaInfo(globPath);



  } catch (e) {
    console.error('ERROR: ', e);
  }

})();
