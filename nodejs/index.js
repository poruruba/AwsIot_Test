var awsIot = require('aws-iot-device-sdk');

const AWSIOT_ENDPOINT = 'a1dwool1zn4i9-ats.iot.ap-northeast-1.amazonaws.com';
const AWSIOT_CLIENT_ID = "test00";
const AWSIOT_TOPIC = "test_sub";

var deviceIot = awsIot.device({
   keyPath: './keys/XXXXXXXXXXXXXXXXX-private.pem.key',
  certPath: './keys/XXXXXXXXXXXXXXXXX-certificate.pem.crt',
    caPath: './keys/AmazonRootCA1.pem',
  clientId: AWSIOT_CLIENT_ID,
      host: AWSIOT_ENDPOINT
});

deviceIot.on('connect', function() {
    console.log('connected');
    deviceIot.subscribe(AWSIOT_TOPIC, undefined, (err, granted) =>{
      if( err ){
          console.error(err);
          return;
      }
      console.log("deviceIot subscribe ok");
  });
});

deviceIot.on('closed', function() {
  console.log('closed');
});

deviceIot.on('message', function(topic, payload) {
  console.log('message (' + topic + ')');
  console.log(payload.toString());
});