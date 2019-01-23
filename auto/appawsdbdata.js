var AWS = require("aws-sdk");
var fs = require('fs');

AWS.config.update({
  region: "us-west-2"
});

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Importing photos into DynamoDB. Please wait.");

let allPhotos = JSON.stringify(JSON.parse(fs.readFileSync('db.json', 'utf8')));

for (let photo of allPhotos) {

  console.log('working on -->\t', photo.name)

  var params = {
    TableName: "Photos",
    Item: {
      "album": photo.album,
      "key": photo.key,
      "name": photo.name,
      "ext": photo.ext,
      "type": photo.type,
      "mime": photo.mime,
      "dir": photo.dir,
      "directory": photo.directory,
      "DTepoch": photo.DTepoch,
      "DTcirca": photo.DTcirca,
      "address0": photo.address0,
      "address1": photo.address1,
      "timeZone": photo.timeZone,
      "GPSPosition": photo.GPSPosition,
      "GPSLatitude": photo.GPSLatitude,
      "GPSLongitude": photo.GPSLongitude,
      "origSize": photo.origSize,
      "origWidth": photo.origWidth,
      "origHeight": photo.origHeight,
      "origBtyes": photo.origBtyes
    }
  };

  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add photo", photo.name, ". Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("PutItem succeeded:", photo.name);
    }
  });
};
