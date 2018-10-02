// require gulp plugins
const gulp = require('gulp');
const debug = require('gulp-debug');
const rename = require("gulp-rename");
const vfs = require('vinyl-fs');
const map = require('map-stream');
const r2 = require("r2");


// photo manipulation and exif
const sharp = require('sharp');
const gm = require('gulp-gm');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const dms2dec = require('dms2dec');
const exif = require('fast-exif');
const jpgexif = require("jpeg-exif");

// google API
//const gMapApiKey = key.json
//const gMapURL = key.json
const gMap = require('@google/maps').createClient({
  key: gMapApiKey,
  Promise: Promise
});

// node functions libs
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');

//
// PhotoLib locations and item search
const baseDir = '../../../skicyclerun/PhotoLib/';
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';

// -------------------------------------------------------------------
// START GULP TASKS
gulp.task('start', function(done) {

  // console.log('wth:', baseDir + subDirPath + imgItems)
  // vfs.src(subDirPath + imgItems, {
  //     cwd: baseDir
  //   })
  //   .pipe(debug({title: 'Start Task:'}))

  done();
});

gulp.task('testAsync', function(cb) {
  getFilesAsync(function(err, res) {
    if (err) return cb(err);
    var stream = gulp.src(res)
      .pipe(minify())
      .pipe(gulp.dest('build'))
      .on('end', cb);
  });
});

gulp.task('rnImages', function(done) {

  const inputDir = subDirPath + imgItems;
  let cronName = null;
  console.log('rnInput --> ', inputDir);
  vfs.src(inputDir, {
      cwd: baseDir
    })

    .pipe(map(function(file, done) {

      let exifData = jpgexif.parseSync(file.path);

      if (exifData === undefined || exifData.SubExif === undefined) {
        var stats = fs.statSync(file.path);
        var dtOriginal = stats.createDate;
        var imageWidthHeight = 'unk_unk';
      } else {
        if (exifData.SubExif === undefined) {
          console.log('Danger Exif: ', exifData, ' for file: ', file.path)
        }
        var dtOriginal = exifData.SubExif.DateTimeOriginal;
      }
      // photos with bad dates
      var dtNewFileName = fDateMoment(dtOriginal);
      if (dtNewFileName == 'Invalid date') {
        dtNewFileName = '00000000_0000' + fRandomNumber(1, 100).toString();
      }
      cronName = dtNewFileName;
      console.log('new name -> ', cronName)
      done(null, file);

    }))

    .pipe(rename({
      //dirname: '',
      //suffix: '-' + imageWidthHeight,
      basename: cronName
    }))

    .pipe(vfs.dest('./_rnImages/', {
      cwd: baseDir
    }))
    .on('end', function() {
      done();
    })
});

function resolveNewName(file) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved');
    }, 2000);
  });
}

gulp.task('szImages', function(done) {

  const inputDir = './_rnImages/**/' + imgItems;
  console.log('szInput --> ', inputDir);
  vfs.src(inputDir, {
      cwd: baseDir
    })

    .pipe(gm(function(gmfile, done) {

      gmfile.size(function(err, size) {

        //console.log('Resizing: ', gmfile.source, '\n{', size.width, 'X', size.height, '}', 'to: ');
        var newValue = calculateAspectRatioFit(size.width, size.height, 1600, 1600)
        //console.log('{', newValue.width, 'X', newValue.height, '}');

        done(null, gmfile
          .quality(100)
          .resize(newValue.width, newValue.height));
      });

    }))

    // write new image to PhotoLib
    .pipe(vfs.dest('./_szImages/', {
      cwd: baseDir
    }))

    .on('end', function() {
      done();
    });

});

gulp.task('mzImages', function(done) {

  const inputDir = './_szImages/**/' + imgItems;
  console.log('mzInput --> ', inputDir);
  vfs.src(inputDir, {
      cwd: baseDir
    })

    .pipe(imagemin([imageminMozjpeg({
      quality: 95
    })]))

    // write new image to PhotoLib
    .pipe(vfs.dest('./_mzImages/', {
      cwd: baseDir
    }))

    .on('end', function() {
      done();
    });

});

gulp.task('imgSmasher', function(done) {

  const inputDir = './_mzImages/**/' + imgItems;
  console.log('imgSmasher --> ', inputDir);
  vfs.src(inputDir, {
      cwd: baseDir
    })

    .pipe(map(log2))

    // write new image to PhotoLib
    .pipe(vfs.dest('./_xxImages/', {
      cwd: baseDir
    }))

    .on('end', function() {
      done();
    });

});

gulp.task('finish', function(done) {
  // vfs.src(subDirPath + imgItems, {
  //     cwd: baseDir
  //   })

    //.pipe(debug({title: 'Finished Task: \n'}))

  done();
});

// ****************************************************************************
// Default Task ---------------------------------------------------------------
gulp.task('default', gulp.series('start', 'testAsync', 'finish', function(done) {

  console.log('Default:')
  done();

}));
// ****************************************************************************


// ****************************************************************************
// Helper Functions------------------------------------------------------------

function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {

  var ratio = [maxWidth / srcWidth, maxHeight / srcHeight];
  ratio = Math.min(ratio[0], ratio[1]);
  if (ratio > 1) {
    ratio = 1
  };

  var newHigth = Math.floor(srcHeight * ratio);
  var newWidth = Math.floor(srcWidth * ratio);

  return {
    width: newWidth,
    height: newHigth
  };
};

function reverseGeoLookup(url) {

  let obj = {ok: true}
  return new Promise(resolve => {
    r2(url).json
    .then(resolve)
    .catch(console.log)
  });

}

//
// deal with the possiblity of no CDATE and provide a base date alternatively
//
function fDateMoment(cDT) {

  var chronDT;

  if (!moment(cDT, 'YYYY:MM:DD HH:mm:ss').isValid()) {

    const min = 100000;
    const max = 235959;
    var s = Math.floor(Math.random() * (max - min + 1)) + min;
    //chronDT = '20150905_' + s
    chronDT = '00000000_' + s;

  } else {

    chronDT = moment(cDT, 'YYYY:MM:DD HH:mm:ss', true).format('YYYYMMDD_HHmmss')

  }

  return chronDT

}


// ****************************************************************************
// Async Keys Tools -----------------------------------------------------------
const log = function(file, cb) {
  console.log('get EXIF:', file.path);
  (async () => {var results = await exifTask(file)
    console.log('trapped: ', results)
    return results
  })()
  cb(null, file);
};

const log2 = async(file, cb) => {
  const imgWM = await exifTask(file);
  //const getImgAdd = await askImgAdd();
  console.log('How did this work: ', file.path, ' ', imgWM)
  cb(null, file);
}

async function log3(file, cb) {

  //console.log(file.path);
  var result = await getExifInfo(file);

  cb(null, result);
};

async function exifTask(file) {

  try {

    let exifData = await getExifInfo(file);
    if (typeof(exifData.gps) != 'undefined') {
      let gpsLatLon = await dms2dec(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef, exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef);
      let latlng = JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
      let url = gMapURL + latlng + '&key=' + gMapApiKey
      let geoInfo = await reverseGeoLookup(url);
      return geoInfo.results[0].formatted_address;
    } else {
      return 'Unknown GPS Location';
    }
  }
  catch (e) {
    console.log('error:', e);
    return null;
  }

}

function getExifInfo(file) {
  return new Promise(resolve => {
    exif.read(file.path)
      .then(resolve)
      .catch(console.log)
  });
}

async function doAsyncStuff(imgFile, cb) {

  // get EXIF info
  console.log('file name is: ', imgFile.path)
  var result = await getExifInfo(imgFile);
  console.log('exif info --> ', result)
  //convert EXIF gps to decimal
  if (typeof(result.gps) != 'undefined') {
    var gpsLatLon = await dms2dec(result.gps.GPSLatitude, result.gps.GPSLatitudeRef, result.gps.GPSLongitude, result.gps.GPSLongitudeRef);

    // get reverse geocode info:
    // https://developers.google.com/maps/documentation/geocoding/start
    let latlng = JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
    let url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latlng + '&key=' + gMapApiKey
    var geoInfo = await reverseGeoLookup(url);
    // console.log('geoInfo: ', `City: ${geoInfo.results[0].formatted_address} -`,
    // `Latitude: ${geoInfo.results[0].geometry.location.lat} -`,
    // `Longitude: ${geoInfo.results[0].geometry.location.lng}`)
    //console.log('File: ', imgFile.path, '\n', geoInfo.results[0].formatted_address)
    photoInfo.location = geoInfo.results[0].formatted_address
    //console.log('\nOther Stuff:', geoInfo.results[0].geometry)
  } else {
    console.warn('NO EXIF --> File: ', imgFile.path);
    photoInfo.location = 'Unknown Location?'
  }

  // Create waterMark


  // wrap task up!
  cb(console.log('we are done!'));

}


gulp.task('asyncTest', function(done) {

  vfs.src(subDirPath + imgItems, {
      cwd: baseDir
    })

    .pipe(map(async function(imgFile, fini) {

      var photoInfo = {
        file: imgFile.path,
        location: null
      }

      // get EXIF info
      var result = await getExifInfo(imgFile);

      // convert EXIF gps to decimal
      if (typeof(result.gps) != 'undefined') {
        var gpsLatLon = await dms2dec(result.gps.GPSLatitude, result.gps.GPSLatitudeRef, result.gps.GPSLongitude, result.gps.GPSLongitudeRef);

        // get reverse geocode info:
        // https://developers.google.com/maps/documentation/geocoding/start
        let latlng = JSON.stringify(gpsLatLon[0]) + ', ' + JSON.stringify(gpsLatLon[1]);
        let url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latlng + '&key=' + gMapApiKey
        var geoInfo = await reverseGeoLookup(url);
        // console.log('geoInfo: ', `City: ${geoInfo.results[0].formatted_address} -`,
        // `Latitude: ${geoInfo.results[0].geometry.location.lat} -`,
        // `Longitude: ${geoInfo.results[0].geometry.location.lng}`)
        //console.log('File: ', imgFile.path, '\n', geoInfo.results[0].formatted_address)
        photoInfo.location = geoInfo.results[0].formatted_address
        //console.log('\nOther Stuff:', geoInfo.results[0].geometry)
      } else {
        console.warn('NO EXIF --> File: ', imgFile.path);
        photoInfo.location = 'Unknown Location?'
      }

      // Create waterMark


      // wrap task up!
      fini(console.log('we are done!'));

    }))

    // write new image to PhotoLib
    .pipe(vfs.dest('./_xxImages/', {
      cwd: baseDir
    }))

    .on('end', function() {
      done();
    });
});




gulp.task('copy', function(done) {
  gulp.src(subDirPath + imgItems, {cwd: baseDir})
    .pipe(gulp.dest('./_originals/', {cwd: baseDir}))

    .on('end', function() {
      done();
    });
});

// gulp.task('szImages', function(done) {
//
//   const inputDir = './_rnImages/**/' + imgItems;
//   gulp.src(inputDir, {cwd: baseDir})
//
//     .pipe(gm(function(gmfile, done) {
//
//       gmfile.size(function(err, size) {
//
//         //console.log('Resizing: ', gmfile.source, '\n{', size.width, 'X', size.height, '}', 'to: ');
//         var newValue = calculateAspectRatioFit(size.width, size.height, 1600, 1600)
//         //console.log('{', newValue.width, 'X', newValue.height, '}');
//
//         done(null, gmfile
//           .quality(97)
//           .resize(newValue.width, newValue.height));
//       });
//
//     }))
//     // .pipe(rename({
//     //   suffix: '_' + 'sz'
//     // }))
//
//     .pipe(gulp.dest('./_szImages/', {cwd: baseDir}))
//
//     .on('end', function() {
//       done();
//     });
//
// });


//
// // size images & set quality (97%)
// gulp.task('wmImages', function(done) {
//
//   const inputDir = './_szImages/**/' + imgItems;
//   gulp.src(inputDir, {cwd: baseDir})
//
//     .pipe(gm(function(gmfile) {
//
//       return gmfile
//         // .stroke("blue", 1)
//         // .fill("transparent")
//         // .drawRectangle(0, 0, 500, 500)
//         .font("Ravie")
//         .fill("Gold")
//         .font("Pythagoras")
//         .pointSize(12)
//         .gravity("SouthWest") //NorthWest|North|NorthEast|West|Center|East|SouthWest|South|SouthEast
//         .drawText(100, 100, waterMark(gmfile))
//     }, {
//       imageMagick: true
//     }))
//
//     .pipe(gulp.dest('./_wmImages/', {
//       cwd: baseDir
//     }))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
//
// // Charcoal
// // _sized [-sz] --> _sized
gulp.task('charcoalImages', function(done) {

  const inputDir = './_wmImages/**/' + imgItems;
  gulp.src(inputDir, {cwd: baseDir})

    .pipe(gm(function(gmfile, done) {

      gmfile.size(function(err, size) {
        done(null, gmfile
          .charcoal());
      });

    }))
    .pipe(rename({
      suffix: '_' + 'bw'
    }))

    .pipe(gulp.dest('./_exImages/', {
      cwd: baseDir
    }))

    .on('end', function() {
      done();
    });

});
//
// // Sepia
// gulp.task('sepiaImages', function(done) {
//
//   const inputDir = './_wmImages/**/' + imgItems;
//   gulp.src(inputDir, {cwd: baseDir})
//
//     .pipe(gm(function(gmfile, done) {
//
//       gmfile.size(function(err, size) {
//         done(null, gmfile
//           .sepia());
//       });
//
//     }))
//     .pipe(rename({
//       suffix: '_' + 'sp'
//     }))
//     .pipe(gulp.dest('./_exImages/', {
//       cwd: baseDir
//     }))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// // randomize file names
// gulp.task('numFiles', function(done) {
//
//   const inputDir = ['./_wmImages/**/' + imgItems,
//                     './_exImages/**/' + imgItems];
//   gulp.src(inputDir, {cwd: baseDir})
//
//     .pipe(rename(function (path) {
//       path.basename = fRandomNumber(1000, 9999).toString();
//     }))
//     .pipe(gulp.dest('./_pub/', {
//       cwd: baseDir
//     }))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// gulp.task('jsonFile', function(done) {
//
//   const inputDir = './_pub/**/' + imgItems;
//   gulp.src(inputDir, {cwd: baseDir})
//
//     .pipe(getExif())
//     // .pipe(debug({
//     //   title: 'File --> '
//     // }))
//
//     .pipe(data(function(file) {
//       var filename = file.filePath.substring(file.filePath.lastIndexOf('/') + 1);
//       var exif = file.exif;
//       var calcLat = gpsDecimal.bind(null, exif.gps.GPSLatitudeRef);
//       var calcLng = gpsDecimal.bind(null, exif.gps.GPSLongitudeRef);
//       var data = {};
//
//       // _.forOwn(exif, function(val, key){
//       //   console.log('Major --> ' + key);
//       // })
//
//       // console.log('CDate --> ' + exif.exif.CreateDate);
//       // console.log('Moment --> ' + moment(exif.exif.CreateDate, 'YYYY:MM:DD HH:mm:ss', true).format('YYYYMMDD_HHmmss'));
//
//       data[filename] = {
//         lat: calcLat.apply(null, exif.gps.GPSLatitude),
//         lng: calcLng.apply(null, exif.gps.GPSLongitude)
//       };
//       file.contents = new Buffer(JSON.stringify(data));
//     }))
//     .pipe(concat('exif.json'))
//     .pipe(gulp.dest('./_pub/', {cwd: baseDir}))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// // flatten directory structure - use after rn files to create time
// gulp.task('fsOneDir', function(done) {
//
//   gulp.src(filePath.dtFiles)
//
//     .pipe(debug({
//       title: 'OneDir --> '
//     }))
//
//     //.pipe(flatten({includeParents: 1}))
//     .pipe(rename({
//       dirname: ''
//     }))
//     .pipe(gulp.dest(filePath.onedir))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// // flatten directory structure - use after rn files to create time
// gulp.task('fsFlatten', function(done) {
//
//   gulp.src(filePath.dtFiles)
//
//     .pipe(flatten({
//       includeParents: 1
//     }))
//     //.pipe(flatten().on('error', function(error) {
//     //   console.log('FLATTEN ERROR');
//     //   done(error);
//     // }))
//
//     .pipe(debug({
//       title: 'Flat Dir File --> '
//     }))
//
//     .pipe(gulp.dest(filePath.flatten))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// // flatten directory structure - use after rn files to create time
// gulp.task('fsCopy', function(done) {
//
//   //gulp.src(filePath.dtFiles)
//   gulp.src(filePath.dtFiles)
//
//     .pipe(debug({
//       title: 'Copy --> '
//     }))
//
//     .pipe(gulp.dest(filePath.flatten))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// gulp.task('fsImages', function(done) {
//
//   vfs.src(files_redate)
//
//     .pipe(debug({
//       title: 'File --> '
//     }))
//
//     .pipe(exif())
//     .pipe(map(fileInfo))
//     .pipe(vfs.dest(folder_export))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// function getMetaData(file) {
//
//   const exiftool = require('node-exiftool')
//   const ep = new exiftool.ExiftoolProcess()
//
//   ep
//     .open()
//     // display pid
//     .then((pid) => console.log('Started exiftool process %s', pid))
//
//     .then(() => ep.readMetadata(file, ['CreateDate', 'GPSAltitude', 'GPSDateTime']))
//     .then(console.log, console.error)
//
//     .then(() => ep.close())
//     .then(() => console.log('Closed exiftool'))
//     .catch(console.error)
//
// }
//
// gulp.task('jpgCompress', function(done) {
//
//   gulp.src(files_import)
//     .pipe(image({
//       pngquant: false,
//       optipng: false,
//       zopflipng: false,
//       jpegRecompress: true,
//       mozjpeg: false,
//       guetzli: false,
//       gifsicle: false,
//       svgo: false,
//       concurrent: 10,
//       quiet: false // defaults to false
//     }))
//     .pipe(gulp.dest(folder_Compressed))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// gulp.task('countImages', function(done) {
//
//   var getEXIF = map(function(code, filename) {
//
//   })
//
//   vfs.src(files_import)
//     //.pipe(map(fileExif))
//     .pipe(map(simpleEXIF))
//     // .pipe(data(function(file) {
//     //   console.log('Processing --> ' + file.filePath)
//     //   //getMetaData(file);
//     // }))
//     .on('end', function() {
//       done();
//     });
//
// });
//
// gulp.task('exifTool', function(done) {
//
//   vfs.src('./_rnImages/**/00000000_*.{heic,jpg,png}', {cwd: baseDir, sourcemaps: true })
//
//     .pipe(debug({
//       title: 'exifTool --> '
//     }))
//
//     .pipe(map(simpleEXIF))
//
//     .on('end', function() {
//       done();
//     });
//
// });
//
// var fileExif = function(file, cb) {
//
//   console.log('File input info --> ', file.filePath)
//   getMetaData(file.filePath);
//
//   cb(null, file);
//
// };
//
// function simpleEXIF(file) {
//
//   var fs = require('fs');
//
//   console.log('In file = ', file)
//   fs.readFile(file, function(err, data) {
//     if (err)
//       //throw err;
//       console.error('Err: ', err);
//     else {
//       console.warn('calling exiftool...')
//       exiftool.metadata(data, ['-createDate', '-modifyDate', '-trackCreateDate', '-trackModifyDate', '-mediaCreateDate', '-mediaModifyDate', '-imageSize'], function(err, metadata) {
//         if (err)
//           throw err;
//         else
//           console.log('Look what I found: ', data);
//       });
//     }
//   });
//
// }
//
// //
// // Helper Functions - global to all tasks
// //

//
// function gpsDecimal(direction, degrees, minutes, seconds) {
//   var d = degrees + minutes / 60 + seconds / (60 * 60);
//   // console.log('gpsDec = ' + d)
//   return (direction === 'S' || direction === 'W') ? d *= -1 : d;
// }
//

// function fRandomNumber(min, max) {
//
//   min = Math.ceil(min);
//   max = Math.floor(max);
//   return Math.floor(Math.random() * (max - min)) + min;
//
// }
//
// var fileInfo = function(file, cb) {
//
//   if (file.exif === undefined) {
//     var exifDate = simpleEXIF(file)
//   } else {
//     var exifDate = file.exif.exif.CreateDate;
//   }
//   //var newDate = moment(exifDate).toDate();
//   if (exifDate === undefined) {
//     //console.log(file.filePath + '\n exif info is --> ', Object.keys(file.exif.image), ' - ', Object.values(file.exif.image));
//   } else {
//     var newDate = moment(exifDate, 'YYYY:MM:DD HH:mm:ss').toDate();
//     fs.utimesSync(file.filePath, newDate, newDate);
//     //console.log(file.filePath, '\n EXIF Cdate --> ', newDate, ' -- ', file.exif)
//   };
//
//   cb(null, file);
//
// };
//
// function waterMark(file){
//
//   var photoDate = null;
//   fastexif.read(file.source)
//     .then((data) => {
//       //console.log('Dates: ', data.exif.DateTimeOriginal)
//       photoDate = fDateMoment(data.exif.DateTimeOriginal);
//     })
//     .catch(console.error);
//
//   return "© https://skicyclerun.com © " + photoDate;
// }

// // WEBP Convert - final
// gulp.task('webpImages', function(done) {
//
//   var webp = require('gulp-webp');
//
//   var filePaths = {
//     lib: '../PhotoLib/',
//     src: '../Export/',
//     folder: 'webp/',
//     files: '**/*.{jpg,png}'
//   }
//
//   var files = '../PhotoLib/Export/**/*.{jpg,png}';
//
//   gulp.src(files)
//     .pipe(webp())
//     .pipe(gulp.dest(filePaths.lib + filePaths.folder));
//
//   done();
//
// });

// // SVG Convert
// gulp.task('svgImages', function(done) {
//
//   var gm = require('gulp-gm');
//
//   var paths = {
//     folder: 'AWS/',
//     src: '../public/',
//     dest: '../PhotoLib/',
//     type: 'svg'
//   }
//
//   var files = [
//     '../PhotoLib/Export/**/*.{jpg,png}',
//     '../PhotoLib/Export/**/*.{JPG,PNG}'
//   ];
//
//   gulp.src(files)
//     .pipe(gm(function (gmfile) {
//
//       return gmfile.setFormat('');
//
//     }))
//     .pipe(gulp.dest(filePaths.dest + filePaths.folder + filePahs.type));
//
//   done();
//
// });

// gulp-image is a compression tool - not sure the real changes...
//

// gulp.task('compressImages', function(done) {
//
//   const image = require('gulp-image');
//
//   var paths = {
//     folder: 'AWS/',
//     src: '../public/',
//     dest: '../PhotoLib/',
//     type: 'compress'
//   }
//
//   var files = [
//     '../PhotoLib/Export/**/*.{jpg,png}',
//     '../PhotoLib/Export/**/*.{JPG,PNG}'
//   ];
//
//   gulp.src(files)
//     .pipe(image({
//       svgo: ['--enable', 'cleanupIDs', '--disable', 'convertColors'],
//       concurrent: 10
//     }))
//     .pipe(gulp.dest(filePahs.dest + filePahs.folder + filePahs.type))
//
//   done();
//
// });

// images gulp task
// gulp.task('burnImages', function(done) {
//
//   var imageresize = require('gulp-image-resize');
//   var gs = require('gulp-image-grayscale');
//
//
//   // set the folder name and the relative paths
//   // in the example the images are in ./assets/images
//   // and the public directory is ../public
//   var paths = {
//     folder: 'AWS/',
//     src: '../public/',
//     dest: '../PhotoLib/'
//   }
//
//   var files = [
//     '../PhotoLib/Export/**/*.{jpg,png}',
//     '../PhotoLib/Export/**/*.{JPG,PNG}'
//   ];
//
//   // create an array of image groups (see comments above)
//   // specifying the folder name, the ouput dimensions and
//   // whether or not to crop the images
//   var images = [{
//       folder: 'largeFormat',
//       width: 1200,
//       crop: false
//     },
//     {
//       folder: 'midFormat',
//       width: 500,
//       height: 330,
//       crop: true
//     },
//     {
//       folder: 'plusFormat',
//       width: 800,
//       height: 500,
//       crop: true
//     }
//   ];
//
//   // loop through image groups
//   images.forEach(function(type) {
//
//     // build the resize object
//     var resize_settings = {
//       width: type.width,
//       crop: type.crop,
//       // never increase image dimensions
//       upscale: false
//     };
//     var gray_settings = {
//       lwip: {
//         png: {
//           compression: 'high'
//         },
//         jpg: {
//           quality: 100
//         }
//       }
//     };
//     // only specify the height if it exists
//     if (type.hasOwnProperty("height")) {
//       resize_settings.height = type.height
//     };
//
//     // grab all images from the folder
//     //gulp.src(paths.src+paths.folder+type.folder+'/**/*')
//     //gulp.src(paths.folder+'/**/*')
//     gulp.src(files)
//
//       // resize them according to the width/height settings
//       .pipe(imageresize(resize_settings))
//       .pipe(gulp.dest(paths.dest + paths.folder + type.folder))
//       .pipe(gs(gray_settings))
//       .pipe(gulp.dest(paths.dest + paths.folder + type.folder))
//
//   });
//
//   done();
//
// });

// // get FS stats data of files
// gulp.task('getPhotoList', function(done) {
//
//   var klawSync = require('klaw-sync');
//   const path = require('path');
//   var moment = require('moment');
//   //moment().format();
//
//   let paths
//   try {
//     paths = klawSync('../PhotoLib/Export')
//   } catch (er) {
//     console.error(er)
//   }
//   paths.forEach(function(photo) {
//     //console.dir(photo.path + ' --> ' + photo.stats.ctime);
//     //console.log(photo.path + ' --> ' + path.basename(photo.path, '.jpg'));
//     console.log('file: ' + photo.path + ' ' + moment(path.basename(photo.path, '.jpg'), 'YYYY').isValid());
//     //moment(path.basename(photo.path, '.jpg'), 'YYYYMMDD_HHmmss').toString();
//     //console.log(path.basename + ' - date: ' + mdate);
//   });
//
//   done();
//
// });


// // images gulp task
// gulp.task('grayImage', function(done) {
//
//   var gs = require('gulp-image-grayscale');
//
//   var paths = {
//     folder: 'SkiCycleRun/',
//     src: '../PhotoLib/public/',
//     dest: '../webpub/'
//   }
//
//   var files = [
//     '../PhotoLib/public/**/*.{jpg,png}',
//     '../PhotoLib/public/**/*.{JPG,PNG}'
//   ];
//
//   return gulp.src('../PhotoLib/public/*')
//     .pipe(gs({
//       lwip: {
//         png: {
//           compression: 'high'
//         },
//         jpg: {
//           quality: 100
//         }
//       }
//     }))
//     .pipe(gulp.dest('../PhotoLib/public/gray/'));
//
//   done();
//
// });

// gulp.task('awsS3List', function(done) {
//
//   var AWS = require('aws-sdk');
//   AWS.config.update({
//     region: 'us-west-2'
//   });
//
//   var credentials = new AWS.SharedIniFileCredentials({
//     profile: 'default'
//   });
//   AWS.config.credentials = credentials;
//
//
//   s3 = new AWS.S3({
//     apiVersion: '2006-03-01'
//   });
//
//   s3.listBuckets(function(err, data) {
//     if (err) {
//       console.log("Error", err);
//     } else {
//       console.log("Success", data.Buckets);
//     }
//   });
//
//   var bucketParams = {
//     Bucket: 'skicyclerun.img'
//   };
//
//   // Call S3 to list objects in the bucket
//   s3.listObjects(bucketParams, function(err, data) {
//     if (err) {
//       console.log("Error", err);
//     } else {
//       console.log("Success", data);
//     }
//   });
//
//   done();
//
// });
//
// gulp.task('awsS3Push', function(done) {
//
//   var AWS = require('aws-sdk');
//   AWS.config.update({
//     region: 'us-west-2'
//   });
//
//   var credentials = new AWS.SharedIniFileCredentials({
//     profile: 'default'
//   });
//   AWS.config.credentials = credentials;
//
//   s3 = new AWS.S3({
//     apiVersion: '2006-03-01'
//   });
//
//   done();
// });
