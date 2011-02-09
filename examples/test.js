var sys = require("sys");
var binary = require("binary");
var memc = require("../lib/parser");
var net = require("net");

var bin = new binary.Binary();
var key = "node-memcached-test";
var data = "test-data";

var encoder = new Buffer(24 + key.length + data.length + 8 + 24 + key.length + (24 + key.length)*5);

var pos = 0;
var size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.SET},
        {"int16": key.length},
        {"int": 0x08},
        {"int": 0},
        {"int16": 0},
        {"int32": data.length + key.length + 8},
        {"int32": 1},
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
        {"int32": 2},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.GETK},
        {"int16": key.length},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": key.length},
        {"int32": 2},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getkmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.GETQ},
        {"int16": key.length},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": key.length},
        {"int32": 2},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getqmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.GETKQ},
        {"int16": key.length},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": key.length},
        {"int32": 2},
        {"int32": 0},
        {"int32": 0},
        {"string": key}
], encoder, pos);
var getkqmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.QUIT},
        {"int16": 0},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": 0},
        {"int32": 3},
        {"int32": 0},
        {"int32": 0}
], encoder, pos);
var quitmsg = encoder.slice(pos, pos + size);
pos += size;
size = bin.pack([
        {"int": memc.constants.general.MAGIC.request},
        {"int": memc.constants.opcodes.STAT},
        {"int16": 0},
        {"int": 0},
        {"int": 0},
        {"int16": 0},
        {"int32": 0},
        {"int32": 4},
        {"int32": 0},
        {"int32": 0}
], encoder, pos);
var statmsg = encoder.slice(pos, pos + size);

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
	connection.parser.execute(buffer, start, end);
};

connection.addListener("connect", function() {
	connection.parser = new memc.parser({
		"chunked": true,
		"encoding": memc.constants.encodings.BINARY
	});
	
	connection.parser.onMessage = function() {
		var message = connection.current;
		count++;
		if(message.header.opcode == memc.constants.opcodes.SET) {
			writeSocket(connection, getqmsg);
		}
		if(message.header.opcode == memc.constants.opcodes.GETQ) {
			writeSocket(connection, getkqmsg);
		}
		if(message.header.opcode == memc.constants.opcodes.GETKQ) {
			writeSocket(connection, getmsg);
		}
		if(message.header.opcode == memc.constants.opcodes.GET) {
			connection.parser.chunked = false;
			connection.parser.encoding = memc.constants.encodings.ASCII;
			writeSocket(connection, statmsg);
		}
		if(message.header.opcode == memc.constants.opcodes.STAT) {
			if(message.header.bodylen == 0) {
				connection.parser.chunked = true;
				connection.parser.encoding = memc.constants.encodings.BINARY;
				writeSocket(connection, quitmsg);
			}
		}
	};

	connection.parser.onHeader = function(header) {
		connection.current = {"header": header, "body": []};
	};

	connection.parser.onExtras = function(extras) {
		connection.current.extras = extras;
	};

	connection.parser.onKey = function(key) {
		connection.current.key = key;
	};

	connection.parser.onBody = function(buffer, start, end) {
		if(connection.parser.chunked) {
			connection.current.body.push(buffer.slice(start, end));
		}
		else {
			connection.current.body = buffer;
		}
	};

	connection.parser.onError = function(err) {
		console.log("error\n" + JSON.stringify(err, null, "\t"));
	};

	writeSocket(connection, setmsg);
});

connection.addListener("end", function() {
	console.log("end");
});

connection.addListener("timeout", function() {
	console.log("timeout");
	connection.end();
});

connection.addListener("close", function() {
	console.log("close");
	connection.end();
});

connection.addListener("error", function(exception) {
	console.log("error\n" + JSON.stringify(exception));
});

connection.connect("/tmp/memcached.sock");
