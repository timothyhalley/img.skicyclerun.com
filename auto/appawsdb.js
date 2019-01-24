'use strict'

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

module.exports = {

  tableExist: async function(dbTable) {
    var params = {};
    // dynamodb.listTables(params, function(err, data) {
    //   if (err) console.log(err, err.stack); // an error occurred
    //   else console.log('there be thy tables: ', data); // successful response
    // });
    var tableObj = await dynamodb.listTables(params).promise();
    var photoTableExists = _.includes(tableObj.TableNames, dbTable);
    if (!photoTableExists) {
      
      // create the AWS DynamoDB table
      await createDBTable(dbTable);

    } else {

      //purge tabel (aka kill it!)
      await deleteDBTable(dbTable);
      // May need a wait buffer here...
      await createDBTable(dbTable);

    }

  }
}

// ****************************************************************************
// AWS Helper Functions------------------------------------------------------------

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

  try {
    var awsInfo = await dynamodb.deleteTable(params).promise();
  } catch (e) {
    console.error('ERROR: can not create table --> ', e);
  }

}
