var Binary = require("binary").Binary;
var memc = require("../lib/parser");
var net = require("net");

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + JSON.stringify(err, null, "\t"));
});

var key = "stress_test";

var numclients = 10;
var bodysize = 16384;
var encoding = memc.constants.encodings.BINARY;
var quitafter = 1000000;
var chunked = true;

if(process.ARGV.length > 2) {
	numclients = process.ARGV[2];
}
if(process.ARGV.length > 3) {
	bodysize = process.ARGV[3];
}
if(process.ARGV.length > 4) {
	encoding = process.ARGV[4];
}
if(process.ARGV.length > 5) {
	quitafter = parseInt(process.ARGV[5]);
}
if(process.ARGV.length > 6) {
	chunked = (process.ARGV[6] == "true");
}

var data = "";
for(var i=0; i<bodysize; i++) {
	data += "0";
}
var bin = new Binary();
var encoder = new Buffer(24 + key.length + data.length + 8 + 24 + key.length + 24);

var pos = 0;
var size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.SET},
        {"int16": key.length},
        {"int": 0x08},
        {"int": 0},
        {"int16": 0},
        {"int32": data.length + key.length + 8},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0xdeadbeef},
        {"int32": 3600},
        {"string": key},
        {"string": data}
], encoder, pos);
var setmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.GET},
        {"int16": key.length},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": key.length},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.QUIT},
        {"int16": 0},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0}
], encoder, pos);
var quitmsg = encoder.slice(pos, pos + size);

var bytesin = 0;
var bytesout = 0;
var count = 0;
var clients = 0;
var sent = 0;

function writeSocket(socket, buffer) {
	if(socket.readyState == "open") {
		try {
			socket.write(buffer);
			bytesout += buffer.length;
			sent++;
		}
		catch(ex) {
		
		}
	}
}

function client() {
	var connection = new net.Stream();
	connection.setNoDelay(true);
	connection.setTimeout(0);
	
	connection.ondata = function (buffer, start, end) {
		bytesin += (end-start);
		connection.parser.execute(buffer, start, end);
	};
	
	connection.addListener("connect", function() {
		clients++;
		connection.parser = new memc.parser({
			"chunked": chunked,
			"encoding": encoding
		});
		
		connection.parser.onMessage = function() {
			count++;
			if(sent < quitafter) {
				writeSocket(connection, getmsg);
			}
			else {
				writeSocket(connection, quitmsg);
				setTimeout(function() {
					if(tt) clearTimeout(tt);
				}, 2000);
			}
		};
	
		connection.parser.onHeader = function(header) {
			//console.log(connection.parser.current);
			connection.current = {"header": header};
			if(connection.parser.chunked && header.bodylen > 0) {
				connection.current.body = [];
			}
		};
	
		connection.parser.onBody = function(buffer, start, end) {
			connection.current.body.push(buffer.slice(start, end));
		};
	
		connection.parser.onError = function(err) {
			console.log("error\n" + JSON.stringify(err, null, "\t"));
		};
	
		writeSocket(connection, setmsg);
	});
	
	connection.addListener("timeout", function() {
		connection.end();
	});
	
	connection.addListener("close", function() {
		connection.end();
	});
	
	connection.addListener("error", function(exception) {
		connection.end();
	});
	
	connection.connect("/tmp/memcached.sock");
}

for(var i=0; i<numclients; i++) {
	client();
}

var then = new Date().getTime();	
var last = 0;
function getstats() {
	var now = new Date().getTime();
	var elapsed = (now - then)/1000;
	var rps = count - last;
	console.log(bytesin + "," + bytesout + "," + encoding + "," + bodysize + "," + clients + "," + ((((bytesin)/elapsed)*8)/(1024*1024)).toFixed(2) + "," + ((((bytesout)/elapsed)*8)/(1024*1024)).toFixed(2) + "," + count + "," + sent + "," + (rps/elapsed).toFixed(2) + "," + (sent-count));
	then = new Date().getTime();
	last = count;
	bytesin = 0;
	bytesout = 0;
}
var tt = setInterval(getstats, 1000);
