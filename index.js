var net = require('net');
var hl7 = require('hl7');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
//The header is a vertical tab character <VT> its hex value is 0x0b.
//The trailer is a field separator character <FS> (hex 0x1c) immediately followed by a carriage return <CR> (hex 0x0d)

var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

/**
 * @constructor MLLPServer
 * @param {string} host a resolvable hostname or IP Address
 * @param {integer} port a valid free port for the server to listen on.
 * @param {object} logger
 * 
 * @fires MLLPServer#hl7  
 * 
 * @example
 * var server = new MLLPServer('hl7server.mydomain', 3333, console.log);
 * 
 * server.on('hl7', function(message) {
 *  console.log("Message: " + message);
 *  // INSERT Unmarshalling or Processing here
 * });
 * 
 * @example
 * <caption>An ACK is sent back to the server</caption>
 *  MSH|^~\&|SOMELAB|SOMELAB|SOMELAB|SOMELAB|20080511103530||ORU^R01|Q335939501T337311002|P|2.3|||
 *  MSA|AA|Q335939501T337311002
 * 
 */
function MLLPServer(host, port, logger) {

    var self = this;
    this.message = '';
    var HOST = host || '127.0.0.1';
    var PORT = port || 6969;
    logger = logger || console.log;

    var Server = net.createServer(function (sock) {

        logger('Connection established......: ' + sock.remoteAddress + ':' + sock.remotePort);

        function ackn(data, ack_type) {
            //get message ID
            var msg_id = data[0][10];

            var header = [data[0]];

            //switch around sender/receiver names
            header[0][3] = data[0][5];
            header[0][4] = data[0][6];
            header[0][5] = data[0][3];
            header[0][6] = data[0][4];

            var result = hl7.serializeJSON(header);
            result = result + "\r" + "MSA|" + ack_type + "|" + msg_id;

            return result;
        }

        sock.on('data', function (data) {
            
            data = data.toString();
            //strip separators
            logger("DATA:\nfrom " + sock.remoteAddress + ':\n' + data.split("\r").join("\n"));
            if (data.indexOf(VT) > -1) {
                self.message = '';
            }

            self.message += data.replace(VT, '');
            if (data.indexOf(FS + CR) > -1) {
                self.message = self.message.replace(FS + CR, '');
                var data2 = hl7.parseString(self.message);
                logger("Message:\r\n" + self.message + "\r\n\r\n");
                //POST this data to the converter
                let data_array = self.message.split("\r")
                let data_json = '{'
                for(value of data_array) {
                    var v = value.split("|")
                    if(data_json == '{') {
                        data_json += '"' + v[0].toLowerCase() + '": "' + value + '"'
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

            
                /**
                 * MLLP HL7 Event. Fired when a HL7 Message is received.
                 * @event MLLPServer#hl7
                 * @type {string}
                 * @property {string} message string containing the HL7 Message (see example below)
                 * @example MSH|^~\&|XXXX|C|SOMELAB|SOMELAB|20080511103530||ORU^R01|Q335939501T337311002|P|2.3|||
                 */
                self.emit('hl7', self.message);
                var ack = ackn(data2, "AA");
                sock.write('Ack Message',VT + ack + FS + CR);
            }
        });

     /**   sock.on('close', function (data) {
            logger('Server disconnected.....: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });*/
        sock.on('end', function () {
            logger('Server disconnected.....: ' + sock.remoteAddress + ' ' + sock.remotePort);
        });

    });

    self.send = function (receivingHost, receivingPort, hl7Data, callback) {
        var sendingClient = new net.connect({
            host: receivingHost,
            port: receivingPort
        }, function () {
            logger('Sending data to ' + receivingHost + ':' + receivingPort);
            logger(VT + hl7Data + FS + CR);
            //sendingClient.write(VT + hl7Data + FS + CR);
            sendingClient.write(VT + hl7Data + FS + CR);
        });

        var _terminate = function () {
            logger('closing connection with ' + receivingHost + ':' + receivingPort);
            sendingClient.end();
        };

        sendingClient.on('data', function (rawAckData) {
            logger('raw ack data', rawAckData);
            logger(receivingHost + ':' + receivingPort + ' ACKED data');

            var ackData = rawAckData
                .toString() // Buffer -> String
                .replace(VT, '')
                .split('\r')[1] // Ack data
                .replace(FS, '')
                .replace(CR, '');
            logger('processed raw ack data', ackData);
            callback(null, ackData);
            _terminate();
        });

        sendingClient.on('error', function (error) {
            logger(receivingHost + ':' + receivingPort + ' couldn\'t process data');

            callback(error, null);
            _terminate();
        });
    };

    Server.listen(PORT, HOST,function(){ console.log('server started listening...');} );
}

util.inherits(MLLPServer, EventEmitter);

exports.MLLPServer = MLLPServer;
