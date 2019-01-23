var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Photos",
    KeySchema: [
        { AttributeName: "key", KeyType: "HASH"},  //Partition key
        { AttributeName: "DTepoch", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "album", AttributeType: "S" },
        { AttributeName: "key", AttributeType: "S" },
        { AttributeName: "name", AttributeType: "S" },
        { AttributeName: "ext", AttributeType: "S" },
        { AttributeName: "type", AttributeType: "S" },
        { AttributeName: "mime", AttributeType: "S" },
        { AttributeName: "dir", AttributeType: "S" },
        { AttributeName: "directory", AttributeType: "S" },
        { AttributeName: "DTepoch", AttributeType: "N" },
        { AttributeName: "DTcirca", AttributeType: "S" },
        { AttributeName: "address0", AttributeType: "S" },
        { AttributeName: "address1", AttributeType: "S" },
        { AttributeName: "timeZone", AttributeType: "S" },
        { AttributeName: "GPSPosition", AttributeType: "S" },
        { AttributeName: "GPSLatitude", AttributeType: "S" },
        { AttributeName: "GPSLongitude", AttributeType: "S" },
        { AttributeName: "origSize", AttributeType: "S" },
        { AttributeName: "origWidth", AttributeType: "S" },
        { AttributeName: "origHeight", AttributeType: "S" },
        { AttributeName: "origBtyes", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
