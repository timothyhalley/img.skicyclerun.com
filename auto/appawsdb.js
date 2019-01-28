'use strict'

// app library tools:
const _lowDB = require('./applowdb.js');

// NODE: tools library
const _ = require('lodash');
const path = require('path');

// NODE: AWS library
// Docs:
// --> https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html

const AWS = require("aws-sdk");
AWS.config.apiVersions = {
  dynamodb: '2012-08-10',
};
AWS.config.update({
  region: "us-west-2"
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {

  genTable: async function(dbTable) {
    var params = {};
    var tableObj = await dynamodb.listTables(params).promise();
    var photoTableExists = _.includes(tableObj.TableNames, dbTable);
    if (!photoTableExists) {

      // create the AWS DynamoDB table
      console.log('Creating table: ', dbTable)
      await createDBTable(dbTable);
      await sleep(5000);

    } else {

      //purge tabel (aka kill it!)
      console.log('Note: S3 table already exists: ', dbTable)

    }

  },

  loadData: async function(dbTable) {
    await sendData(dbTable);
  }
}

// ****************************************************************************
// AWS Helper Functions------------------------------------------------------------
async function sendData(dbTable) {

  let albums = await _lowDB.getAlbums()
  for (let album of albums) {
    console.log('Updating AWS dynamoDB with photo album: ', album);

    let photos = _lowDB.getAlbumPhotos(album);
    for (let photo of photos) {
      console.log('\t S3 upsert photo --> ', photo.name)

      try {
        var items = buildInsert(photo);
        var results = docClient.put(items).promise();
        //console.log(buildInsert(photo))
      } catch (e) {
        console.error('ERROR: problems inserting data into table --> ', e);
      }

    }
  }

}

function buildInsert(p) {

  let iData = {
    TableName: "Photos",
    Item: {
      album: p.album,
      key: p.key,
      name: p.name,
      ext: p.ext,
      type: p.type,
      mime: p.mime,
      DTepoch: p.DTepoch,
      DTcirca: p.DTcirca,
      address0: p.address0,
      address1: p.address1,
      timeZone: p.timeZone,
      GPSPosition: p.GPSPosition,
      GPSLatitude: p.GPSLatitude,
      GPSLongitude: p.GPSLongitude,
      origSize: p.origSize,
      origWidth: p.origWidth,
      origHeight: p.origHeight,
      origBtyes: p.origBtyes
    }
  };

  // console.debug('S3 document: ', iData);
  return iData;
}

function sleep(ms) {
  console.log('... Pausing for ', ms, ' millseconds for AWS')
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDBTable(dbTable) {

  let params = {
    TableName: dbTable,
    KeySchema: [{
        AttributeName: "album",
        KeyType: "HASH"
      },
      {
        AttributeName: "key",
        KeyType: "RANGE"
      }
    ],
    AttributeDefinitions: [{
        AttributeName: "album",
        AttributeType: "S"
      },
      {
        AttributeName: "key",
        AttributeType: "S"
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
    }
  };

  try {
    var awsInfo = await dynamodb.createTable(params).promise();
  } catch (e) {
    console.error('ERROR: can not create table --> ', e);
  }

}

async function deleteDBTable(dbTable) {

  var params = {
   TableName: dbTable
  };
  try {
    var awsInfo = await dynamodb.deleteTable(params).promise();
  } catch (e) {
    console.error('ERROR: can not create table --> ', e);
  }

}
