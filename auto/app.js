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
// //
console.log('... getting all photos and album info ...');
let globPath = baseDir + subDirPath;
_f.getMetaInfo(globPath)
_f.photoWorks();
// console.log('... shape photos for uploading to SkiCycleRun ...');
//_f.photoWorks();

// // *** works!
// (async () => {
//
//   try {
//     const paths = await globby([baseDir, imgItems]);
//     //console.log('Number of photos: ', paths.length)
//     await paths.forEach(photo => {
//       //console.log('photo --> ', path.basename(photo))
//       _fdb.upsert(photo);
//     })
//   } catch (e) {
//     console.error('ERROR: ', e);
//   }
// })();
