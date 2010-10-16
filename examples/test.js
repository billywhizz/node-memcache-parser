var sys = require("sys");
var binary = require("../lib/binary");
var memc = require("../lib/parser");
var net = require("net");

var bin = new binary.Binary();
var key = "node-memcached-test";
var data = "test-data";

var encoder = new Buffer(24 + key.length + data.length + 8 + 24 + key.length + 24);

var pos = 0;
var size = bin.pack([
        {"int": memc.constants.general.MEMC_MAGIC.request},
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
        {"int": memc.constants.general.MEMC_MAGIC.request},
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
        {"int": memc.constants.general.MEMC_MAGIC.request},
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
	
	connection.parser.onMessage = function(message) {
		sys.puts("message\n" + JSON.stringify(message, null, "\t"));
		count++;
		if(message.header.opcode == memc.constants.opcodes.SET) {
			writeSocket(connection, getmsg);
		}
		if(message.header.opcode == memc.constants.opcodes.GET) {
			writeSocket(connection, quitmsg);
		}
	};

	connection.parser.onHeader = function(message) {
		sys.puts("header\n" + JSON.stringify(message, null, "\t"));
		if(connection.parser.chunked && message.header.bodylen > 0) {
			connection.current = message;
			connection.current.body = [];
		}
	};

	connection.parser.onBody = function(buffer, start, end) {
		sys.puts("chunk: " + (end-start));
		connection.current.body.push(buffer.slice(start, end));
	};

	connection.parser.onError = function(err) {
		sys.puts("error\n" + JSON.stringify(err, null, "\t"));
	};

	writeSocket(connection, setmsg);
});

connection.addListener("end", function() {
	sys.puts("end");
});

connection.addListener("timeout", function() {
	sys.puts("timeout");
	connection.end();
});

connection.addListener("close", function() {
	sys.puts("close");
	connection.end();
});

connection.addListener("error", function(exception) {
	sys.puts("error\n" + JSON.stringify(exception));
});

connection.connect("/tmp/memcached.sock");