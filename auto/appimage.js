'use strict'

const _fdb = require('./appdb.js');

var im = require('imagemagick');

module.exports = {

  resizeImage: async function() {

    //let photos = _fdb.getAllPhotos()
    let albums = _fdb.getAllPhotos('Halley Family', 'album')
    console.log('got some photos!: ', albums);


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
