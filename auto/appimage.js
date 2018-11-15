'use strict'
// Docs -->
// http://aheckmann.github.io/gm/docs.html

const _fdb = require('./appdb.js');

const gm = require('gm');
const fse = require('fs-extra');
const path = require('path');

module.exports = {

  processAlbums: async function(albums) {

    albums.forEach(album => {
      console.log('calling ...', album)
      resizeImage(album);
    })

  }

}

// ****************************************************************************
// Helper Functions------------------------------------------------------------
async function resizeImage(album) {

  let photos = _fdb.getAlbumPhotos(album);

  for (let photo of photos) {
    let newValue = calculateAspectRatioFit(photo.origWidth, photo.origHeight, 1600, 1600);
    console.log('Resizing Photo: ', photo.album, ' --> ', photo.name);

    let photoPath = path.join(photo.directory, photo.name);
    let photoOut = photoPath.replace('PhotoLib', 'PhotoOut');
    await fse.ensureDir(path.dirname(photoOut));
    gm(photoPath)
      .resize(newValue.width, newValue.height)
      .quality(100)
      .font("Ravie")
      .fontSize(22)
      .stroke("Blue", 1)
      .fill("Red")
      .gravity("NorthWest") //NorthWest|North|NorthEast|West|Center|East|SouthWest|South|SouthEast
      .drawText(100, 100, "© https://skicyclerun.com ©")
      .gravity("SouthEast")
      .fontSize(11)
      .drawText(100, 100, waterMark(photo))
      .write(photoOut, function (err) {
        if (err) console.log('ERROR:', err);
      })
  }

}

function waterMark(photo){

  let wm = photo.album + '\n'
  wm = wm + photo.circa + '\n'
  wm = wm + photo.address0 + '\n'
  wm = wm + photo.GPSPosition

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
