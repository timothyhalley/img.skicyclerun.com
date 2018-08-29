//
// Sample Source -->
// https://github.com/google/google-api-nodejs-client/tree/master/samples/drive
//

const fs = require('fs');
const os = require('os');
const path = require('path');
var _ = require("lodash");

const readline = require('readline');
const {google} = require('googleapis');
const {OAuth2Client} = require('google-auth-library');

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

const TOKEN_PATH = 'credentials.json';
const authNow = require('clientSession');

// Load client secrets from a local file.
fs.readFile('API_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {
    client_secret,
    client_id,
    redirect_uris
  } = credentials.installed;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
var nextPage = null;
var fileNo = 0;

function listFiles(auth, nextPage) {
  const drive = google.drive({
    version: 'v3',
    auth
  });
  drive.files.list({
    q: "mimeType='image/jpeg'",
    //q: "mimeType='image/jpeg' and trashed=true",
    //q: "parents collection in 'AF1QipN0WJWqX9ZLOc2YbrA5o_McOEkg9-LZYUW2bBNI'",
    spaces: 'drive',
    pageSize: 1,
    pageToken: nextPage,
    orderBy: 'modifiedTime',
    fields: 'nextPageToken, files(id, name, parents, mimeType, modifiedTime, size, imageMediaMetadata)'
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    nextPage = data.nextPageToken;
    const files = data.files;
    if (files.length) {

      files.map((file) => {
        var fileInfo = {
          fileId: `${file.id}`,
          name: `${file.name}`,
          mimeType: `${file.mimeType}`,
          metaData: `${file.imageMediaMetadata}`
        };
        //console.log(`${file.name} (${file.imageMediaMetadata} -- ${file.size}) [${file.parents} ${file.mimeType} ${file.modifiedTime}]`);
        fileNo++;
        console.log('File: ', fileNo, ' ', fileInfo.name, ' ', fileInfo.fileId);
        //traversObj(file);
        dlFile(auth, fileInfo);
        process.on('unhandledRejection', (reason, p) => {
          console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
          // application specific logging, throwing an error, or other logic here
        });

      });
    } else {
      console.log('No files found.');
    }
    // if (nextPage) {
    //   listFiles(auth, nextPage);
    // };
  });
}

async function dlFile(auth, fileInfo) {

  console.log('calling...');

  var result = await downloadFile(auth, fileInfo).catch((err) => {
    console.log(err);
  });
  console.log(result);

}

async function downloadFile (auth, fileInfo) {

  const drive = google.drive({
    version: 'v3',
    auth
  });


  return new Promise(async (resolve, reject) => {

    const filePath = path.join(os.homedir(), 'Projects/PhotoLib/', fileInfo.name);
    console.log('DL file to ', filePath, ' for fileID of ', fileInfo.fileId);
    var fileId = fileInfo.fileId;
    console.log(`writing to ${filePath}`);
    const dest = fs.createWriteStream(filePath);

    let progress = 0;
    const res = await drive.files.get(
      {fileId, alt: 'media'},
      {responseType: 'stream'}
    );

    res.data
      .on('end', () => {
        console.log('Done downloading file.');
        resolve(filePath);
      })
      .on('error', err => {
        console.error('Error downloading file.');
        reject(err);
      })
      .on('data', d => {
        progress += d.length;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`Downloaded ${progress} bytes`);
      })
      .pipe(dest);
  });
}

//
// async function uberDL(drive, fileInfo) {
//
//   return new Promise(async (resolve, reject) => {
//
//     const filePath = path.join(os.homedir(), 'Projects/PhotoLib/', fileInfo.name);
//     console.log('DL file to ', filePath, ' for fileID of ', fileInfo.fileId);
//     var fileId = fileInfo.fileID;
//     console.log(`writing to ${filePath}`);
//     const dest = fs.createWriteStream(filePath);
//     let progress = 0;
//     const res = await drive.files.get({
//       fileId: fileId,
//       alt: 'media'
//     }, {
//       responseType: 'stream'
//     });
//     res.data
//       .on('end', () => {
//         console.log('Done downloading file.');
//         resolve(filePath);
//       })
//       .on('error', err => {
//         console.error('Error downloading file.');
//         reject(err);
//       })
//       .on('data', d => {
//         progress += d.length;
//         process.stdout.clearLine();
//         process.stdout.cursorTo(0);
//         process.stdout.write(`Downloaded ${progress} bytes`);
//       })
//       .pipe(dest);
//   });
// }
//
//
//
// function traversObj(inObj) {
//
//   //console.log('Metadata: ', Object.keys(inObj.imageMediaMetadata), Object.values(inObj.imageMediaMetadata));
//   console.log('Metadata: ', Object.entries(inObj.imageMediaMetadata));
//   //new Map(newObj).forEach(logMapElements);
//   console.log('-----------')
//   for (const [key, value] of Object.entries(inObj)) {
//     console.log(`${key} ${value}`);
//   }
//   console.log('-----*-----')
// }
//
// function logMapElements(value, key, map) {
//   console.log(`m[${key}] = ${value}`);
// }
//
// function isObject(obj) {
//   return obj === Object(obj);
// }
//
// function downloadFileNW(auth, fileInfo) {
//
//   const drive = google.drive({
//     version: 'v3',
//     auth
//   });
//
//   var dest = fs.createWriteStream(`${os.tmpdir()}/` + fileInfo.fileName);
//
//   console.log('Write File here: ', `${os.tmpdir()}/` + fileInfo.fileName)
//
//   // drive.files.get({
//   //     fileId: fileInfo.fileID,
//   //     mimeType: fileInfo.mimeType
//   //   })
//   //   .on('end', function() {
//   //     console.log('Done');
//   //   })
//   //   .on('error', function(err) {
//   //     console.log('Error during download', err);
//   //   })
//   //   .pipe(dest);
//
//   return;
// }
//
// //get all of the files within a given parent (folder) and mimeType
//
// function getPhotos(auth) {
//
//   const getFiles = (auth) => {
//
//     const drive = google.drive({
//       version: 'v3',
//       auth
//     });
//
//     let request = { //make the request header
//       auth: auth,
//       q: "mimeType='image/jpeg' and trashed=true",
//       spaces: 'drive,photos',
//       pageSize: 1,
//       orderBy: 'createdTime',
//       fields: 'nextPageToken, files(id, name, parents, mimeType, modifiedTime, size, imageMediaMetadata)'
//     }
//
//     drive.files.list(request).then(r => {
//       let files = {};
//       r.data.files.forEach(f => files[f.name] = f.id);
//       return files;
//     });
//   }
// }
//
// function download3(auth, fileInfo, done) {
//
//   const drive = google.drive({
//     version: 'v3',
//     auth
//   });
//
//   const dest = fs.createWriteStream(`${os.tmpdir()}/` + fileInfo.fileName);
//   drive.files.export({
//     fileId: fileInfo.fileID,
//     mimeType: fileInfo.mimeType
//   }, {
//     responseType: 'stream'
//   }, function(err, response) {
//     if (err) return done(err);
//
//     response.data.on('error', err => {
//         done(err);
//       }).on('end', () => {
//         done();
//       })
//       .pipe(dest);
//   });
// }
//
// async function download(auth, fileInfo) {
//
//   const drive = google.drive({
//     version: 'v3',
//     auth
//   });
//
//   // [START main_body]
//   await new Promise(async (resolve, reject) => {
//
//     const dest = fs.createWriteStream(`${os.tmpdir()}/` + fileInfo.fileName);
//
//     //console.log('File ID = ', fID);
//     const res = await drive.files.export({
//       fileId: fileInfo.fileID,
//       mimeType: fileInfo.mimeType
//     }, {
//       responseType: 'stream'
//     });
//
//     res.data
//       .on('end', () => {
//         console.log('Done downloading document.');
//         resolve();
//       })
//       .on('error', err => {
//         console.error('Error downloading document.');
//         reject(err);
//       })
//       .pipe(dest);
//   });
//   // [END main_body]
// }
//
// function download2(auth, fileInfo, done) {
//
//   const drive = google.drive({
//     version: 'v3',
//     auth
//   });
//   //const dest = fs.createWriteStream(fName);
//   console.log('Downloading file = ', fileInfo.Name)
//
//   drive.files.export({
//     fileId: fileInfo.fileID,
//     mimeType: fileInfo.mimeType
//   }, {
//     responseType: 'stream'
//   }, function(err, response) {
//     if (err) return done(err);
//
//     response.data.on('error', err => {
//         done(err);
//       }).on('end', () => {
//         done();
//       })
//       .pipe(dest);
//   });
// }
