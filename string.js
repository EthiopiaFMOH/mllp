var fs = require('fs');

var hl7Message = '';

var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

hl7Message = fs.readFileSync('./test/fixtures/text.txt').toString().split('\n');
console.log(hl7Message);