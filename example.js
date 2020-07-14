var mllp = require('./index.js');
var fs = require('fs');

var server = new mllp.MLLPServer('192.168.0.163', 15001);

// Subscribe to inbound messages
/*server.on('hl7', function (data){
  console.log('received payload:', data);
});*/

// Send outbound messages
//server.send('127.0.0.1', 4321, 'outbound-hl7-message', function (err, ackData) {
    // async callback code here
//});
var hl7Message = '';
hl7Message = fs.readFileSync('./test/fixtures/labOrder.txt').toString().split('\n').join('\r');

// Send outbound messages
server.send('192.168.0.139', 15000, hl7Message, function (err, ackData) {
    // async callback code here
    console.log('err:', err);
    console.log('ackData:', ackData);
});