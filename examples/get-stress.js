var sys = require("sys");
var binary = require("../lib/binary");
var memc = require("../lib/parser");
var net = require("net");

var key = process.ARGV[2];
//var data = process.ARGV[3];

var data = "";
for(var i=0; i<16384; i++) {
	data += "0";
}
var bin = new binary.Binary();
var encoder = new Buffer(65535);

var pos = 0;
var size = bin.pack([
        {"int": 0x80},
        {"int": 0x01},
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
        {"int": 0x80},
        {"int": 0x00},
        {"int16": key.length},
        {"int": 0x00},
        {"int": 0},
        {"int16": 0},
        {"int32": key.length},
        {"int32": 0},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getmsg = encoder.slice(pos, pos + size);

var bytesin = 0;
var bytesout = 0;
var count = 0;

function writeSocket(socket, buffer) {
	bytesout += buffer.length;
	socket.write(buffer);
}

var connection = new net.Stream();
connection.setNoDelay(true);
connection.setTimeout(0);

connection.ondata = function (buffer, start, end) {
	bytesin += (end-start);
	connection.parser.execute(buffer.slice(start, end));
};

connection.addListener("connect", function() {
	connection.parser = new memc.parser();
	connection.parser.chunked = true;
	
	connection.parser.onMessage = function(message) {
		//sys.puts("message\n" + JSON.stringify(message, null, "\t"));
		count++;
		//if(message.opcode == 0x01) {
			writeSocket(connection, getmsg);
		//}
	};

	connection.parser.onHeader = function(message) {
		//sys.puts("header\n" + JSON.stringify(message, null, "\t"));
		if(connection.parser.chunked && (message.totlen - (message.keylen + message.exlen)) > 0) {
			connection.current = message;
			connection.current.body = [];
		}
	};

	connection.parser.onBody = function(chunk) {
		//will only be fired when chunked is true
		//sys.puts("chunk: " + chunk.length);
		connection.current.body.push(chunk);
	};

	connection.parser.onError = function(err) {
		sys.puts("error\n" + JSON.stringify(err, null, "\t"));
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
	sys.puts(JSON.stringify(exception));
});

connection.connect(11211, "icms.owner.net");

var then = new Date().getTime();	
var last = 0;
setInterval(function() {
	var now = new Date().getTime();
	var elapsed = (now - then)/1000;
	var rps = count - last;
	sys.puts("InRate: " + parseInt((((bytesin)/elapsed)*8)/(1024*1024)) + ", OutRate: " + parseInt((((bytesout)/elapsed)*8)/(1024*1024)) + ", Count: " + count + ", MPS: " + rps/elapsed);
	then = new Date().getTime();
	last = count;
	bytesin = 0;
	bytesout = 0;
}, 1000);
