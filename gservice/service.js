'use strict';

// [START main_body]
const {google} = require('googleapis');
const express = require('express');
const opn = require('opn');
const path = require('path');

const fs = require('fs');
const os = require('os');
var _ = require('lodash');
var moment = require('moment');

const keyfile = path.join(__dirname, 'client_secret.json');
const keys = JSON.parse(fs.readFileSync(keyfile));
const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Create an oAuth2 client to authorize the API call
const client = new google.auth.OAuth2(
  keys.web.client_id,
  keys.web.client_secret,
  keys.web.redirect_uris[0]
);

// Generate the url that will be used for authorization
this.authorizeUrl = client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});

// Open an http server to accept the oauth callback. In this
// simple example, the only request to our webserver is to
// /oauth2callback?code=<code>
const app = express();
app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;
  client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error getting oAuth tokens:');
      throw err;
    }
    client.credentials = tokens;
    res.send('Authentication successful! Please return to the console.');
    server.close();
    listFiles(client, null);
  });
  client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      // store the refresh_token in my database!
      console.log(tokens.refresh_token);
    }
    console.log(tokens.access_token);
  });
});
const server = app.listen(3000, () => {
  // open the browser to the authorize url to start the workflow
  opn(this.authorizeUrl, { wait: false });
});

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
var nextPage = null;
var fileNo = 0;
var fileOther = 0;
var fileTotal = 0;
var fileMax = 30000;
var waitTime = 2500;
var pageSize = 1;

function listFiles(auth, nextPage) {

  // API: https://developers.google.com/drive/api/v3/reference/files/list
  //Found File:  4826   IMG_9834.JPG   2017   7524
  // Trash total: 20459!!!

  // --> and not name contains 'facetile' \
  //     and not name contains 'fullsizeoutput' \
  //     and not name contains 'IMG_' \

      // and not name contains 'Android' \
      // and not name contains 'fullsizeoutput' \
      // and not name contains 'jpegvideocomplement' \
      // and not name contains 'scan' \
      // and not name contains 'cpl' \
      // and not name contains 'BLVPRINT01' \
      // and not name contains 'FireHouse' \
      // and not name contains '_thumb_' \
      // and not name contains '_mini_' \
      // and not name contains '_largepv_' \
      // and not name contains 'HPIM' \
      // and not name contains 'facetile' \
      // and not name contains 'IMG_' \
      // and mimeType='image/jpeg' \
      // or mimeType='image/gif' \
      // or mimeType = 'audio/mpeg' \
      // or mimeType = 'audio/mpeg3' \
      // or mimeType = 'audio/mp3' \
      // or mimeType = 'video/quicktime'

  const service = google.drive('v3');
  const q_val = "trashed=true \
                  and name contains 'IMG_' \
                  and mimeType='image/jpeg' \
                  or mimeType='image/gif'"

      //q: "trashed=true and mimeType='image/jpeg' or mimeType='image/gif' or mimeType = 'audio/mpeg' or mimeType = 'audio/mpeg3' or mimeType = 'audio/mp3' or mimeType = 'video/quicktime'

  service.files.list({
    auth: auth,
    //q: "mimeType='image/jpeg' and trashed=true and name contains 'IMG_'", // photos
    //q: "mimeType='image/gif' and trashed=true", // photos
    //q: "mimeType = 'audio/mpeg' or mimeType = 'audio/mpeg3' or mimeType = 'audio/mp3' and trashed=true and name contains 'IMG_'", // Movies
    //q: "mimeType = 'video/quicktime' and trashed=true and name contains 'IMG_'", // Movies
    //q: "mimeType = 'video/mp4' and trashed=true and name contains 'VIRB0141'", // other Movies
    //q: "mimeType = 'video/mp4'",
    //q: "trashed=true and mimeType='image/jpeg' or mimeType='image/gif' or mimeType = 'audio/mpeg' or mimeType = 'audio/mpeg3' or mimeType = 'audio/mp3' or mimeType = 'video/quicktime' and not name contains 'BLVPRINT01' and not name contains 'facetile'",
    q: q_val,
    spaces: 'drive',
    pageSize: pageSize,
    pageToken: nextPage,
    orderBy: 'name',
    fields: 'nextPageToken, files(id, name, parents, mimeType, modifiedTime, size, imageMediaMetadata)'}, (err, {data}) => {
    if (err) {
      console.error('The API returned an error.', err);
      throw err;
    }
    nextPage = data.nextPageToken;
    const files = data.files;
    if (files.length) {

      files.map((file) => {
        var fileInfo = {
          fileId: `${file.id}`,
          name: `${file.name}`,
          modifiedTime: `${file.modifiedTime}`,
          size: `${file.size}`,
          year: moment(`${file.modifiedTime}`).year(),
          mimeType: `${file.mimeType}`,
          metaData: `${file.imageMediaMetadata}`
        };

        fileTotal++;
        if (fileInfo.name.includes('IMG_')) {
          fileNo++;
          //traversObj(file);
          dlFile(auth, fileInfo);
        } else {
          fileOther++;
        };
        console.log('IMG file: ', fileNo, ' Other File: ', fileOther, ' - Totals: ', fileTotal, ' ', fileInfo.name, ' ', fileInfo.size, ' ', fileInfo.year);
        //dlFile(auth, fileInfo);

      });
    } else {
      console.log('No files found.');
    }
    if (nextPage && fileNo < fileMax) {
      timeout(waitTime).then(listFiles(auth, nextPage));
    };
  });
}

function timeout(delay) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, delay);
  });
}

async function dlFile(auth, fileInfo) {

  //console.log('DL file... ', fileInfo.name);

  var result = await downloadFile(auth, fileInfo).catch((err) => {
    console.log(err);
  });
  console.log(result);

}
function mkdirPath(dirPath) {

  const mkdirSync = function(dirPath) {
    try {
      fs.mkdirSync(dirPath)
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
    }
  };

}

function getFileName (fileInfo) {

  var fileName = null;
  var fileName = 'Projects/PhotoLib/Trashed/' + '[' + fileInfo.year + '] - [' + path.basename(fileInfo.name, path.extname(fileInfo.name)) + '] - [' + fileInfo.fileId + ']' + path.extname(fileInfo.name);

  return fileName
}

async function downloadFile (auth, fileInfo) {

  return new Promise(async (resolve, reject) => {

    const drive = google.drive({
      version: 'v3', auth
    });

    var fileVer = 0;
    //ar fileName = 'Projects/PhotoLib/Trashed/' + fileInfo.year + '-' + path.basename(fileInfo.name, path.extname(fileInfo.name)) + '_' + fileVer.toString() + path.extname(fileInfo.name);
    var filePath = path.join(os.homedir(), getFileName(fileInfo));
    //console.log('DL file to ', filePath, ' for fileID of ', fileInfo.fileId);

    // while (fs.existsSync(filePath)) {
    //   fileVer++;
    //   var fileName = 'Projects/PhotoLib/Trashed/' + fileInfo.year + '-' + path.basename(fileInfo.name, path.extname(fileInfo.name)) + '_' + fileVer.toString() + path.extname(fileInfo.name);
    //   filePath = path.join(os.homedir(), fileName);
    //   if (fs.existsSync(filePath) == false) {
    //     break;
    //   }
    // }
    //console.log('FilePath = ', filePath)
    if (!fs.existsSync(filePath)) {
      console.log('Writing file: ', filePath);
      const dest = fs.createWriteStream(filePath);
      let progress = 0;
      let fileId = fileInfo.fileId;
      const res = await drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      res.data
        .on('end', () => {
          //console.log('Done downloading file.');
          resolve(filePath);
        })
        .on('error', err => {
          console.error('\n\nError downloading file.\n\n', filePath);
          reject(err);
        })
        .on('data', d => {
          progress += d.length;
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(`Downloaded ${progress} bytes`);
        })
        .pipe(dest);
    } else {

      console.log('File exist - skipping download! --> ', filePath);
    };
  });
}

function traversObj(inObj) {

  Object.keys(inObj).forEach(function(objItem) {
        if (inObj[objItem] instanceof Object) {
          traversObj(inObj[objItem])
        } else {
          console.log('objItem ', objItem, ': ', inObj[objItem]);
        }
  });

}

function flatten(object, separator = '.') {

	const isValidObject = value => {
		if (!value) {
			return false
		}

		const isArray  = Array.isArray(value)
		const isObject = Object.prototype.toString.call(value) === '[object Object]'
		const hasKeys  = !!Object.keys(value).length

		return !isArray && isObject && hasKeys
	}

	const walker = (child, path = []) => {

		return Object.assign({}, ...Object.keys(child).map(key => isValidObject(child[key])
			? walker(child[key], path.concat([key]))
			: { [path.concat([key]).join(separator)] : child[key] })
		)
	}

	return Object.assign({}, walker(object))
}
