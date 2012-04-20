var binary = require("./binary");
var memc = require("./parser");
var net = require("net");
var util = require("util");
var events = require("events");

var bin = new binary.Binary();

function writeSocket(connection, buffer, encoding) {
	connection.write(buffer);
}

var Connection = exports.Connection = function() {
	var _reqs = {};
	var _self = this;
	var connection = new net.Stream();
	connection.queue = [];
	connection.setNoDelay(true);
	connection.setTimeout(0);
	var _conncb = null;
	var _opaque = 1;
	var _lastread = 0;
  
  connection.on("data", function(b) {
		_self.parser.execute(b, 0, b.length);
  });

	_self.parser = new memc.parser({
		"chunked": true,
		"encoding": memc.constants.encodings.BINARY
	});
	
	connection.addListener("connect", function() {
		_self.parser.reset();
		
		_self.parser.onMessage = function() {
			var message = _self.parser.current;
      if(message.header.opaque > _lastread) {
				delete _reqs["K" + _lastread];
        _lastread = message.header.opaque;
      }
			var key = "K"+message.header.opaque;
			if(key in _reqs) {
				_reqs[key](message);
			}
			else {
        _self.parser.onError(new Error("message key not recognised"));
			}
		};
	
		_self.parser.onHeader = function(header) {
			if(_self.parser.chunked && header.bodylen > 0) {
				_self.parser.current.body = [];
			}
		};
	
		_self.parser.onBody = function(buffer, start, end) {
			if(arguments.length > 1) {
				_self.parser.current.body.push(buffer.slice(start, end));
			}
		};
	
		_self.parser.onError = function(exception) {
			_self.emit("error", {"type": "parser", "exception": exception});
		};
		if(_conncb) _conncb();
	});
	
	connection.addListener("end", function() {
		_self.emit("close");
	});
	
	connection.addListener("timeout", function() {
		connection.end();
	});
	
	connection.addListener("close", function(had_error) {
		connection.end();
	});
	
	connection.addListener("error", function(exception) {
		_self.emit("error", {"type": "connection", "exception": exception});
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
	
	_self.end = function() {
		connection.end();
	}
	
	_self.get = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.GET},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.getq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.GETQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.getk = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.GETK},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.getkq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.GETKQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

//TODO: add CAS
	_self.set = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.SET},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.setq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.SETQ},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.add = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.ADD},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.addq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.ADDQ},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.replace = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.REPLACE},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.replaceq = function(key, value, flags, expiration, cb) {
		var encoder = new Buffer(32 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.REPLACEQ},
	        {"int16": key.length},
	        {"int": 0x08},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length + 8},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": flags},
	        {"int32": expiration},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.inc = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.INCREMENT},
	        {"int16": key.length},
	        {"int": 20},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": 0},
	        {"int32": initial},
	        {"int32": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.dec = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.DECREMENT},
	        {"int16": key.length},
	        {"int": 20},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": 0},
	        {"int32": initial},
	        {"int32": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.incq = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.INCREMENTQ},
	        {"int16": key.length},
	        {"int": 20},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": 0},
	        {"int32": initial},
	        {"int32": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.decq = function(key, delta, initial, expiration, cb) {
		var encoder = new Buffer(24 + 20 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.DECREMENTQ},
	        {"int16": key.length},
	        {"int": 20},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length + 20},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": 0},
	        {"int32": delta},
	        {"int32": 0},
	        {"int32": initial},
	        {"int32": expiration},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.delete = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.DELETE},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.deleteq = function(key, cb) {
		var encoder = new Buffer(24 + key.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.DELETEQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.append = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.APPEND},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.prepend = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.PREPEND},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.appendq = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.APPENDQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.prependq = function(key, value, cb) {
		var encoder = new Buffer(24 + key.length + value.length);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.PREPENDQ},
	        {"int16": key.length},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": value.length + key.length},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0},
	        {"string": key},
	        {"string": value}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.quit = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.QUIT},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.quitq = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.QUITQ},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.version = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.VERSION},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.stat = function(key, cb) {
		if(key) {
			var encoder = new Buffer(24 + key.length);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.STAT},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": key.length},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0},
	        	{"string": key}
			], encoder, 0);
		}
		else {
			var encoder = new Buffer(24);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.STAT},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 0},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0}
			], encoder, 0);
		}
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.noop = function(cb) {
		var encoder = new Buffer(24);
		var size = bin.pack([
	        {"int": memc.constants.general.MAGIC.request},
	        {"int": memc.constants.opcodes.NOOP},
	        {"int16": 0},
	        {"int": 0},
	        {"int": 0},
	        {"int16": 0},
	        {"int32": 0},
	        {"int32": _opaque},
	        {"int32": 0},
	        {"int32": 0}
		], encoder, 0);
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.flush = function(expiration, cb) {
		if(expiration) {
			var encoder = new Buffer(24 + 8);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSH},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 8},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0},
				{"int32": expiration}
			], encoder, 0);
		}
		else {
			var encoder = new Buffer(24);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSH},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 0},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0}
			], encoder, 0);
		}
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}

	_self.flushq = function(expiration, cb) {
		if(expiration) {
			var encoder = new Buffer(24 + 8);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSHQ},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 8},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0},
				{"int32": expiration}
			], encoder, 0);
		}
		else {
			var encoder = new Buffer(24);
			var size = bin.pack([
		        {"int": memc.constants.general.MAGIC.request},
		        {"int": memc.constants.opcodes.FLUSHQ},
		        {"int16": 0},
		        {"int": 0},
		        {"int": 0},
		        {"int16": 0},
		        {"int32": 0},
		        {"int32": _opaque},
		        {"int32": 0},
		        {"int32": 0}
			], encoder, 0);
		}
		_reqs["K"+(_opaque++)] = cb;
		writeSocket(connection, encoder);
	}
};
util.inherits(Connection, events.EventEmitter);

exports.constants = memc.constants;