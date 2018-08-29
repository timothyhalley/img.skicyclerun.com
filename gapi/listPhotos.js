'use strict';

const {
  google
} = require('googleapis');
const AuthClient = require('./authclient.js');

const drive = google.drive({
  version: 'v3',
  auth: AuthClient.oAuth2Client
});

async function listDrive(query) {
  const params = {
    q: "mimeType='image/jpeg'",
    pageSize: 10,
    orderBy: 'modifiedTime',
    fields: 'nextPageToken, files(id, name, parents, mimeType, modifiedTime, size, imageMediaMetadata)'
  };
  params.q = query;
  const res = await drive.files.list(params);
  console.log('Repsonse Data', res.data);
  return res.data;
}

if (module === require.main) {
  const scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
  AuthClient.authenticate(scopes)
    .then(c => listDrive())
    .catch(console.error);
}

module.exports = {
  listDrive,
  client: AuthClient.oAuth2Client
};
