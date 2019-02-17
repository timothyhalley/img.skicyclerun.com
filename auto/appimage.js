'use strict'
// Docs -->
// http://aheckmann.github.io/gm/docs.html

const _fdb = require('./applowdb.js');

const fs = require('fs');
const fse = require('fs-extra');
const jimp = require('jimp');
const path = require('path');
const _ = require('lodash');

const COPYRIGHT = "© https://skicyclerun.com ©";
const JIMPQUALITY = 15;

module.exports = {

  processAlbums: async function(albums) {

    for (let album of albums) {
      console.log('Processing album: ', album)
      await smashImages(album);

    }
  }
}

// ****************************************************************************
// Helper Functions------------------------------------------------------------
// https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/image-optimization
async function smashImages(album) {

  let photos = _fdb.getAlbumPhotos(album);

  for (let photo of photos) {

    //console.log('does file exist? ', fs.existsSync(photo), '\n', photo )
    if (fs.existsSync(photo.inPath)) {

      let newValue = calculateAspectRatioFit(photo.origWidth, photo.origHeight, 1600, 1600);
      console.log('\tPhoto --> ', photo.name);

      let setLegendVertRows = null;

      try {

        await jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(font => {
          let wmTextWidth = jimp.measureText(font, COPYRIGHT)
          let wmTextHeight = jimp.measureTextHeight(font, COPYRIGHT)
        })

        await jimp.loadFont(jimp.FONT_SANS_16_BLACK).then(font => {
          let wmTextWidth = jimp.measureText(font, COPYRIGHT)
          let wmTextHeight = jimp.measureTextHeight(font, COPYRIGHT)
          setLegendVertRows = [newValue.height - wmTextHeight * 4,  newValue.height - wmTextHeight * 3, newValue.height - wmTextHeight * 2, newValue.height - wmTextHeight * 1];
        })

        await jimp.read(photo.inPath)

          .then(image => (image.clone()
            .resize(newValue.width, newValue.height) // resize
          ))

          .then(image => (
            jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(font => ([image, font]))
          ))

          .then(data => {

            let image = data[0];
            let font = data[1];

            return image
              .print(font, 10, 10, COPYRIGHT)
          })

          .then(image => (
            jimp.loadFont(jimp.FONT_SANS_16_BLACK).then(font => ([image, font]))
          ))

          .then(data => {

            let image = data[0];
            let font = data[1];

            return image
              .print(font, 10, setLegendVertRows[0], setValue(photo.album))
              .print(font, 10, setLegendVertRows[1], setValue(photo.DTcirca))
              .print(font, 10, setLegendVertRows[2], setValue(photo.address.address0))
              .print(font, 10, setLegendVertRows[3], setValue(photo.GPSPosition))
          })

          .then(image => {
            return image
              .quality(JIMPQUALITY)
              .write(setPhotoPathOut(photo.inPath, '_OG')) // null vs '_A1'
          })

          .then(image => {
            return image
              .sepia()
              .write(setPhotoPathOut(photo.inPath, '_SP'));
          })

          .then(image => {
            return image
              .greyscale()
              .write(setPhotoPathOut(photo.inPath, '_GR'));
          })

          .then(image => {
            return image
              .convolute([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
              .write(setPhotoPathOut(photo.inPath, '_EB'));
          })

          .then(image => {
            return image
              .posterize(4)
              .write(setPhotoPathOut(photo.inPath, '_PZ'));
          })

          .catch(err => {
            console.error(err);
          });

      } catch (e) {
        console.log('Found larger problem: ', e)
      }

    } else {
      console.warn('WARNING: PHOTO JPG on drive not found. No updates to db.JSON for photo item: \t', photo.name)
    }
  }
}

function setPhotoPathOut(inPath, suffix) {

  let pathObj = path.parse(inPath);
  let pathOutDir = pathObj.dir;
  let basePath = pathOutDir.substring(0, pathOutDir.indexOf('albums') + 6);
  let albumName = _.camelCase(pathOutDir.substring(basePath.length + 1, pathOutDir.length));

  let newPath = path.join(basePath, albumName);
  let newFileName = _.camelCase(pathObj.name);
  if (suffix != null) {
     newFileName = newFileName + suffix;
  };
  newFileName = newFileName + pathObj.ext;
  newPath = path.join(newPath, newFileName)
  newPath = newPath.replace('PhotoLib', 'PhotoOut');

  return newPath
}

function waterMark(photo) {

  let wm = photo.album

  if (photo.DTcirca != null) {
    wm = wm + '\r\n' + photo.DTcirca;
  }

  if (photo.address0 != null) {
    wm = wm + '\r\n' + photo.address0;
  }

  if (photo.GPSPosition != null) {
    wm = wm + '\r\n' + photo.GPSPosition;
  }


  return wm;
}

function  setValue(item) {
  let val = null;
  if (item == null) {
    val = ' ';
  } else {
    val = item;
  }
  return val;
}

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


//**********************************************
// const gm = require('gm');
// const sharp = require('sharp');

// --> GM version working:
// fse.ensureDir(path.dirname(photoOut));
// const image = gm(photoPath)
// image
//   .resize(newValue.width, newValue.height)
//   .quality(100)
//   .font("Chalkduster")
//   .fontSize(48)
//   .stroke("Blue", 1)
//   .fill("Gold")
//   //.gravity("NorthWest") //NorthWest|North|NorthEast|West|Center|East|SouthWest|South|SouthEast
//   .drawText(100, 100, "© https://skicyclerun.com ©", "NorthWest")
//   .fontSize(18)
//   .drawText(100, 100, waterMark(photo), "SouthEast")
//   .write(photoOut, function(err) {
//     if (err) console.log('ERROR:', err);
//   })

// await sharp(photoPath)
//   .jpeg({
//     quality: 100,
//     chromaSubsampling: '4:4:4'
//   })
//   .toBuffer()
//   .then(data => {
//     fse.writeFileSync(photoOut, data);
//   })
//   .catch(err => {
//     console.log(err);
//   });

//* JIMP -->
// let maxFontWidth = 500;
// let maxFontHeight = 500;
//
// let wmTextHeight = 0;
// let wmWidth = 100;
// let wmHeight = 100;
// // wmWidth = jimp.measureText(jimp.FONT_SANS_32_BLACK, wmText) // width of text
// await jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(font => {
//   //console.log(jimp.measureTextHeight(font, wmText, 100))
//   wmTextHeight = jimp.measureTextHeight(font, wmText, 25)
// });
// let vertText = newValue.height - wmTextHeight;
//
// await jimp.read(photoPath)
//   .then(image => (
//     jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(font => ([image, font]))
//   ))
//   .then(data => {
//
//     let image = data[0];
//     let font = data[1];
//
//     return image
//       .print(font, 25, vertText, {
//           text: wmText,
//           alignmentX: jimp.HORIZONTAL_ALIGN_LEFT,
//           alignmentY: jimp.VERTICAL_ALIGN_BOTTOM
//         },
//         maxFontWidth,
//         maxFontHeight)
//       .write(photoWM);
//   })
//   .then(image => {
//     return image
//       .resize(newValue.width, newValue.height) // resize
//       .quality(100) // set JPEG quality
//       .write(photoResize); // save
//   })
//   .then(image => {
//     return image
//       .sepia()
//       .write(photoSepia);
//   })
//   .catch(err => {
//     console.error(err);
//   });
