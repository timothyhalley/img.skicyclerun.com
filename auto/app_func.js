'use strict'
const path = require('path');

function getAlbum(pathOf) {

  var albumPath = path.dirname(pathOf);
  var valStart = albumPath.lastIndexOf('/') + 1;
  var valEnd = albumPath.length;
  var album = albumPath.substring(valStart, valEnd);
  return album
}

module.exports = {getAlbum}
