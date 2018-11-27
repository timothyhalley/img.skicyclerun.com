'use strict'
// app library functions:
const _f = require('./appfunc.js');
const _fdb = require('./appdb.js');
const _fim = require('./appimage.js')

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

    let globPath = baseDir + subDirPath + imgItems;
    await _f.getMetaInfo(globPath);
    let albums = await _fdb.getAlbums()
    await _fim.processAlbums(albums);

  } catch (e) {
    console.error('ERROR: ', e);
  }

})();
