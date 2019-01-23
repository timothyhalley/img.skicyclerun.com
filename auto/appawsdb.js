var AWS = require("aws-sdk");


AWS.config.update({
  region: "us-west-2"
});

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Photos",
    KeySchema: [
        { AttributeName: "album", KeyType: "HASH" },
        { AttributeName: "key", KeyType: "RANGE"}
    ],
    AttributeDefinitions: [
        { AttributeName: "album", AttributeType: "S" },
        { AttributeName: "key", AttributeType: "S" }
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
