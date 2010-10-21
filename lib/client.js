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
		_self.emit("close");
	});
	
	connection.addListener("timeout", function() {
		connection.end();
	});
	
	connection.addListener("close", function() {
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

	_self.getq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.GETQ},
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

	_self.getk = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.GETK},
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

	_self.getkq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.GETKQ},
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

//TODO: add CAS
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

	_self.setq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.SETQ},
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

	_self.add = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.ADD},
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

	_self.addq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.ADDQ},
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

	_self.replace = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.REPLACE},
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

	_self.replaceq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(33 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.REPLACEQ},
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

	_self.inc = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.INCREMENT},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": initial},
	        {"int16": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.dec = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.DECREMENT},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": initial},
	        {"int16": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.incq = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.INCREMENTQ},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": initial},
	        {"int16": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.decq = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.DECREMENTQ},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": initial},
	        {"int16": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.delete = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.DELETE},
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

	_self.deleteq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.DELETEQ},
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

	_self.append = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.APPEND},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.prepend = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.PREPEND},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.appendq = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.APPENDQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.prependq = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.PREPENDQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _reqs.length},
	        {"int32": 0},
	        {"int32": 0},
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

	_self.quitq = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.QUITQ},
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

	_self.stat = function(key, cb) {
		if(key) {
			var encoder = new Buffer(24 + key.length);
			var size = bin.pack([
		        {"int": memc.constants.general.MEMC_MAGIC.request},
		        {"int": memc.constants.opcodes.STAT},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": key.length},
		        {"int32": _reqs.length},
		        {"int32": 0},
		        {"int32": 0},
	        	{"string": key}
			], encoder, 0);
		}
		else {
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
		}
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.noop = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MEMC_MAGIC.request},
	        {"int": memc.constants.opcodes.NOOP},
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

	_self.flush = function(expiration, cb) {
		if(expiration) {
			var encoder = new Buffer(32);
			var size = bin.pack([
		        {"int": memc.constants.general.MEMC_MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSH},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 8},
		        {"int32": _reqs.length},
		        {"int32": 0},
		        {"int32": 0},
				{"int32": expiration}
			], encoder, 0);
		}
		else {
			var encoder = new Buffer(24);
			var size = bin.pack([
		        {"int": memc.constants.general.MEMC_MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSH},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 0},
		        {"int32": _reqs.length},
		        {"int32": 0},
		        {"int32": 0}
			], encoder, 0);
		}
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}

	_self.flushq = function(expiration, cb) {
		if(expiration) {
			var encoder = new Buffer(32);
			var size = bin.pack([
		        {"int": memc.constants.general.MEMC_MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSHQ},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 8},
		        {"int32": _reqs.length},
		        {"int32": 0},
		        {"int32": 0},
				{"int32": expiration}
			], encoder, 0);
		}
		else {
			var encoder = new Buffer(24);
			var size = bin.pack([
		        {"int": memc.constants.general.MEMC_MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSHQ},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 0},
		        {"int32": _reqs.length},
		        {"int32": 0},
		        {"int32": 0}
			], encoder, 0);
		}
		_reqs[_reqs.length] = cb;
		writeSocket(connection, encoder.slice(0, size));
	}
};
sys.inherits(Connection, events.EventEmitter);

exports.constants = memc.constants;