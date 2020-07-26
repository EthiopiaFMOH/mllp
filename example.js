var mllp = require('./index.js');
var fs = require('fs');
var http = require('http');
var hl7 = require('hl7');
//var server = new mllp.MLLPServer('127.0.0.1', 1234);

var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

// Subscribe to inbound messages
let data = VT + "MSH|^~\&|POLYTECH||||202007221159||ORU^R01|1|P|2.3|||\rPID|1|_000553969|_000553969|_000553969|Test patient|||M|||||||||||||||||||||||\rPV1|1|||||EPHI|1234567890^^^Ephi^^^^^^^^^NPI|^^^^^^^^^^^^NPI|ETHIOPIAN PUBLIC HEALTH INSTITUTE|ADDIS ABABA|||||||||||||\rORC|RE||||||||202007221159|||1234567890^^^Ephi^^^^^^^^^NPI||||||||\rOBR|1||20204013493|COV-19^COVID - 19|||202007221123|||||||||1234567890^^^Ephi^^^^^^^^^NPI||||NIAL||202007221159|||F|||||||||||||||||||||||\rOBX|1|ST|COV-19^Covid||NEG||()|||NIAL|F|||202007221159||||" + FS + CR

data = data.toString();
//strip separators
console.log("DATA:\n" + data.split("\r").join("\n"));
if (data.indexOf(VT) > -1) {
  message = '';
}

message += data.replace(VT, '');
if (data.indexOf(FS + CR) > -1) {
  message = message.replace(FS + CR, '');
  var data2 = hl7.parseString(message);
  console.log("Message:\r\n" + message + "\r\n\r\n");
  //POST this data to the converter
  let data_array = message.split("\r")
  let data_json = '{'
  for(value of data_array) {
      var v = value.split("|")
      if(data_json == '{') {
          data_json += '"' + v[0].toLowerCase() + '": "' + value.replace("&", "\\\\&") + '"'
      } else {
          data_json += ', "' + v[0].toLowerCase() + '": "' + value + '"'
      }

  }
  data_json += '}'
  // An object of options to indicate where to post to
  var post_options = {
      host: 'localhost',
      port: '3001',
      path: '/result',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data_json)
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      });
  });

  // post the data
  post_req.write(data_json);
  post_req.end();
}












// server.on(message, function (data){
//   console.log('received payload:', data);
// });

// Send outbound messages
// server.send('127.0.0.1', 4321, 'outbound-hl7-message', function (err, ackData) {
//     //async callback code here
// });
// var hl7Message = '';
// hl7Message = fs.readFileSync('./test/fixtures/labOrder.txt').toString().split('\n').join('\r');

// // Send outbound messages
// server.send('127.0.01', 1234, hl7Message, function (err, ackData) {
//     // async callback code here
//     console.log('err:', err);
//     console.log('ackData:', ackData);
// });