'use strict';

/**
 * Provide an oauth2 workflow.
 */

const {google} = require('googleapis');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const opn = require('opn');
const destroyer = require('server-destroy');
const fs = require('fs');
const path = require('path');
const os = require('os');

var certPath = os.homedir() + '/Projects/certificate/'
const keyPath = path.join(__dirname, 'oAuth_secret.json');
let keys = { redirect_uris: [''] };
if (fs.existsSync(keyPath)) {
  keys = require(keyPath).web;
}

//console.log('path: ', os.homedir(), path.dirname('~/Projects/certificate'));

const httpsOptions = {
  key: fs.readFileSync(certPath + 'localhost.pem'),
  cert: fs.readFileSync(certPath + 'localhost.pem'),
  ca: fs.readFileSync(certPath + 'localhost.pem')
}

class AuthClient {
  constructor (options) {
    this._options = options || { scopes: [] };

    // create an oAuth client to authorize the API call
    this.oAuth2Client = new google.auth.OAuth2(
      keys.client_id,
      keys.client_secret,
      keys.redirect_uris[0]
    );
  }

  // Open an http server to accept the oauth callback.
  async authenticate (scopes) {
    return new Promise((resolve, reject) => {
      // grab the url that will be used for authorization
      this.authorizeUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(' ')
      });

      const server = https.createServer(httpsOptions, async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = querystring.parse(url.parse(req.url).query);
            res.end('Authentication successful! Please return to the console.');
            server.destroy();
            const {tokens} = await this.oAuth2Client.getToken(qs.code);
            this.oAuth2Client.credentials = tokens;
            resolve(this.oAuth2Client);
          }
        } catch (e) {
          reject(e);
        }
      }).listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        opn(this.authorizeUrl, {wait: false}).then(cp => cp.unref());
      });
      destroyer(server);
    });
  }
}

module.exports = new AuthClient();
