var binary = require("./binary");
var memc = require("./parser");
var net = require("net");
var sys = require("sys");
var events = require("events");

var bin = new binary.Binary();

function writeSocket(socket, buffer) {
	socket.write(buffer);
}

var Connection = exports.Connection = function(options) {
	var _reqs = [];
	var _self = this;
	var connection = new net.Stream();
	connection.setNoDelay(true);
	connection.setTimeout(0);
	var _conncb = null;
	
	connection.ondata = function (buffer, start, end) {
		connection.parser.execute(buffer, start, end);
	};

	_self.chunked = true;
	_self.encoding = memc.constants.encodings.BINARY;
	
	connection.addListener("connect", function() {
		connection.parser = new memc.parser({
			"chunked": _self.chunked,
			"encoding": _self.encoding
		});
		
		connection.parser.onMessage = function(message) {
			_reqs[message.header.opaque](message);
		};
	
		connection.parser.onHeader = function(message) {
			if(connection.parser.chunked && message.header.bodylen > 0) {
				connection.current = message;
				connection.current.body = [];
			}
		};
	
		connection.parser.onBody = function(buffer, start, end) {
			connection.current.body.push(buffer.slice(start, end));
		};
	
		connection.parser.onError = function(err) {

		};
		if(_conncb) _conncb();
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
		sys.puts(JSON.stringify(exception, null, "\t"))
	});
	
	_self.connect = function(port, host, cb) {
		_conncb = cb;
		if(host) {
			connection.connect(port, host);
		}
		else {
			connection.connect(port);
		}
	}
	
	_self.get = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.GET},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.set = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.SET},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.quit = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.QUIT},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.version = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.VERSION},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.stat = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.STAT},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}
};
sys.inherits(Connection, events.EventEmitter);

exports.constants = memc.constants;