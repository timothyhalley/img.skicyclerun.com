'use strict'
// Docs -->
// http://aheckmann.github.io/gm/docs.html

const _fdb = require('./appdb.js');


var jimp = require('jimp');
const fs = require('fs')
const fse = require('fs-extra');
const path = require('path');

module.exports = {

  processAlbums: async function(albums) {

    albums.forEach(album => {
      console.log('Processing album: ', album)
      smashImages(album);
    })

  }
}

// ****************************************************************************
// Helper Functions------------------------------------------------------------
async function smashImages(album) {

  let photos = _fdb.getAlbumPhotos(album);

  for (let photo of photos) {
    //console.log('does file exist? ', fs.existsSync(photo), '\n', photo )
    let photoPath = path.join(photo.directory, photo.name);
    if (fs.existsSync(photoPath)) {
      let newValue = calculateAspectRatioFit(photo.origWidth, photo.origHeight, 1600, 1600);
      console.log('Processing Photo: ', photo.album, ' --> ', photo.name);

      let photoOut = photoPath.replace('PhotoLib', 'PhotoOut');
      let photoResize = photoOut.replace('albums', 'resized');
      let photoSepia = photoOut.replace('albums', 'sepia');
      let photoWM = photoOut.replace('albums', 'watermark');
      let font = jimp.loadFont(jimp.FONT_SANS_128_BLACK);
      let maxFontWidth = 800;
      let maxFontHeight = 500;

      let wmText = waterMark(photo);
      let wmWidth = 100;
      let wmHeight = 100;
      // wmWidth = jimp.measureText(jimp.FONT_SANS_32_BLACK, wmText) // width of text
      //console.log('TEXT height --> ', jimp.measureTextHeight(jimp.FONT_SANS_32_BLACK, wmText, 100))   // height of text


      //await fse.ensureDir(path.dirname(photoOut));

      await jimp.read(photoPath)
        .then(image => (
            jimp.loadFont(jimp.FONT_SANS_32_WHITE).then(font => ([image, font]))
          ))
        .then(data => {

            let image = data[0];
            let font = data[1];

            return image
              .print(font, 100, newValue.height - 100, {
                text: wmText,
                alignmentX: jimp.HORIZONTAL_ALIGN_LEFT,
                alignmentY: jimp.VERTICAL_ALIGN_BOTTOM},
                maxFontWidth,
                maxFontHeight)
              .write(photoWM);
        })
    .then(image => {
        return image
          .resize(newValue.width, newValue.height) // resize
          .quality(100) // set JPEG quality
          .write(photoResize); // save
      })
      .then(image => {
        return image
          .sepia()
          .write(photoSepia);
      })
      .catch(err => {
        console.error(err);
      });


  } else {
    console.warn('WARNING: PHOTO does not exist - reported by db.JSON (purge db.JSON - rerun app!)')
  }
}
}

async function resizeImage(album) {

  let photos = _fdb.getAlbumPhotos(album);

  for (let photo of photos) {
    let newValue = calculateAspectRatioFit(photo.origWidth, photo.origHeight, 1600, 1600);
    console.log('Resizing Photo: ', photo.album, ' --> ', photo.name);

    let photoPath = path.join(photo.directory, photo.name);
    let photoOut = photoPath.replace('PhotoLib', 'PhotoOut');
    await fse.ensureDir(path.dirname(photoOut));

    jimp.read(photoPath)
      .then(image => {
        return image
          .resize(newValue.width, newValue.height) // resize
          .quality(95) // set JPEG quality
          .greyscale() // set greyscale
          .write(photoOut); // save
      })
      .catch(err => {
        console.error(err);
      });
  }
}

function waterMark(photo) {

  let wm = photo.album

  if (photo.circa != null) {
    wm = wm + '\r\n' + photo.circa;
  }

  if (photo.address0 != null) {
    wm = wm + '\r\n' + photo.address0;
  }

  if (photo.GPSPosition != null) {
    wm = wm + '\r\n' + photo.GPSPosition;
  }


  return wm;
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

// await gm(photoPath)
//   .resize(newValue.width, newValue.height)
//   .quality(100)
//   .font("Ravie")
//   .fontSize(32)
//   .stroke("Blue", 1)
//   .fill("Gold")
//   //.gravity("NorthWest") //NorthWest|North|NorthEast|West|Center|East|SouthWest|South|SouthEast
//   .drawText(100, 100, "© https://skicyclerun.com ©", "NorthWest")
//
//   .fontSize(18)
//   .drawText(100, 100, waterMark(photo), "SouthEast")
//   .writeAsync(photoOut, function (err) {
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
