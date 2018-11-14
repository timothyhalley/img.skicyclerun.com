'use strict'

const _fdb = require('./appdb.js');

const gm = require('gm');

module.exports = {

  resizeImage: async function() {


    let photos = _fdb.getAlbumPhotos('DeerValleySki 2013');
    photos.forEach(photo => {
      let newValue = calculateAspectRatioFit(photo.origWidth, photo.origHeight, 1600, 1600);
      console.log('Directory: ', photo.directory);
      let newPath = photo.direcotry.replace('PhotoLib', 'PhotoOut')
      gm(photo.directory)
        .resize(newValue.width, newValue.height)
        .write(newPath, function (err) {
          if (err) console.log('ERROR:', err);
        })
    })

    // let albums = _fdb.getAllPhotos('Halley Family', 'album')
    // console.log('got some photos!: ', albums);

  }

}

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
