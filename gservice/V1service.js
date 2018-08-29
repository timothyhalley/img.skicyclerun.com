'use strict';

// [START main_body]
const {google} = require('googleapis');
const express = require('express');
const opn = require('opn');
const path = require('path');
const fs = require('fs');

const keyfile = path.join(__dirname, 'client_secret.json');
const keys = JSON.parse(fs.readFileSync(keyfile));
const scopes = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

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
    listFiles(client);
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
function listFiles (auth) {
  const service = google.drive('v3');
  service.files.list({
    auth: auth,
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)'
  }, (err, res) => {
    if (err) {
      console.error('The API returned an error.');
      throw err;
    }
    const files = res.data.files;
    if (files.length === 0) {
      console.log('No files found.');
    } else {
      console.log('Files:');
      for (const file of files) {
        console.log(`${file.name} (${file.id})`);
      }
    }
  });
}
