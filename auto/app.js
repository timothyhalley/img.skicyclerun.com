// Node core:
const path = require('path');

// Addon Node modules:
const globby = require('globby');

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)


// PhotoLib locations and item search
const baseDir = '../../../skicyclerun/PhotoLib/';
const subDirPath = 'albums/**/'
const imgItems = '*.{heic,jpg,jpeg,gif,png,HEIC,JPG,JPEG,GIF,PNG}';

(async () => {
    const paths = await globby([baseDir, imgItems]);

    paths.forEach(dir => {
      console.log(path.basename(dir))
    })

    //return paths;

})();
