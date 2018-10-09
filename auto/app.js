'use strict'
// app library functions:
const _f = require('./app_func.js');
const _fdb = require('./appdb_func.js');

// Node core:
const path = require('path');

// Addon Node modules:
const globby = require('globby');

// PhotoLib locations and item search
const baseDir = '../../../skicyclerun/PhotoLib/';
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';

_fdb.dbInit();

// async function getAllPhotos() {
//
//   const photos = await globby([baseDir, imgItems]);
//
//   return photos;
// }
//
// async function runDown() {
//   var result = getAllPhotos();
//   return result;
// }
//
// console.log('BEFORE');
//
// let allPhotos =[];
// allPhotos = runDown();
// console.log('Photos --> ', allPhotos);
//
// console.log('AFTER');


//
let total = (async () => {

  try {
    const paths = await globby([baseDir, imgItems]);
    //console.log('Number of photos: ', paths.length)
    await paths.forEach(photo => {
      //console.log('photo --> ', path.basename(photo))
      _fdb.upsert(photo);
    })
  } catch (e) {
    console.error('ERROR: ', e);
  }
})();

console.log(total)
