var sys = require("sys");

var constants = {
	"opcodes": {
		"GET": 0x00,
		"SET": 0x01,
		"ADD": 0x02,
		"REPLACE": 0x03,
		"DELETE": 0x04,
		"INCREMENT": 0x05,
		"DECREMENT": 0x06,
		"QUIT": 0x07,
		"FLUSH": 0x08,
		"GETQ": 0x09,
		"NOOP": 0x0A,
		"VERSION": 0x0B,
		"GETK": 0x0C,
		"GETKQ": 0x0D,
		"APPEND": 0x0E,
		"PREPEND": 0x0F,
		"STAT": 0x10,
		"SETQ": 0x11,
		"ADDQ": 0x12,
		"REPLACEQ": 0x13,
		"DELETEQ": 0x14,
		"INCREMENTQ": 0x15,
		"DECREMENTQ": 0x16,
		"QUITQ": 0x17,
		"FLUSHQ": 0x18,
		"APPENDQ": 0x19,
		"PREPENDQ": 0x1A
	},
	"encodings": {
		"BINARY": 0,
		"ASCII": 1,
		"UTF8": 2
	},
	"general": {
		"MEMC_HEADER_LEN": 24,
		"MEMC_MAGIC": {
			"request": 0x80,
			"response": 0x81
		},
		"MEMC_MAX_BODY": 1048477
	},
	"parser": {
		"state": {
			"HEADER": 0,
			"EXTRA": 1,
			"KEY": 2,
			"BODY": 3
		}
	},
	"status": {
		"NO_ERROR": 0x00,
		"KEY_NOT_FOUND": 0x01,
		"KEY_EXISTS": 0x02,
		"VALUE_TOO_LARGE": 0x03,
		"INVALID_ARGUMENTS": 0x04,
		"ITEM_NOT_STORED": 0x05,
		"INCR_DECR_NON_NUMERIC": 0x06,
		"UNKNOWN_COMMAND": 0x81,
		"OUT_OF_MEMORY": 0x82
	}
};

//TODO:
/*
	* Key length can be up to 65535 bytes so should probably have a chunked option for it too.
	* Opaque allows matching responses with requests
	* CAS can be used to not update if the version you have is stale
*/
function Parser(options) {
	var _parser = this;
	var loc = 0;
	var message = {};
	
	var _header = new Buffer(constants.general.MEMC_HEADER_LEN);
	var _extras = null;
	var _key = null;
	var _body = null;
	var toparse = 0;
	var pos = 0;
	
	_parser.chunked = true;
	_parser.encoding = constants.encodings.BINARY;
	if(options) {
		_parser.chunked = options.chunked;
		_parser.encoding = options.encoding;
	}
	_parser.state = constants.parser.state.HEADER;
	_parser.onMessage = _parser.onError = _parser.onHeader = _parser.onBody = _parser.onKey = _parser.onExtras = null;

	_parser.reset = function() {
		loc = 0;
		message = {};
		_extras = null;
		_key = null;
		_body = null;
		toparse = 0;
		_parser.state = constants.parser.state.HEADER;
		pos = 0;
	}
	
	_parser.execute = function(buffer, start, end) {
		if(!start) start = 0;
		if(!end) end = buffer.length;
		pos = start;

		while (pos < end) {
			switch(_parser.state) {
				case constants.parser.state.HEADER:
					if(loc == constants.general.MEMC_HEADER_LEN - 1) {
						message = {
							"header": {}
						};
						_header[loc++] = buffer[pos];
						var obj = _header.unpack("oonoonNNNN", 0);
						message.header.magic = obj[0];
						message.header.opcode = obj[1];
						message.header.keylen = obj[2];
						message.header.exlen = obj[3];
						message.header.datatype = obj[4];
						message.header.status = obj[5];
						message.header.totlen = obj[6];
						message.header.opaque = obj[7];
						message.header.cashi = obj[8];
						message.header.caslo = obj[9];
						message.header.bodylen = message.header.totlen - (message.header.exlen + message.header.keylen);
						
						if(_parser.onHeader) _parser.onHeader(message);
						if(message.header.exlen > 0) {
							_extras = new Buffer(message.header.exlen);
							_parser.state = constants.parser.state.EXTRA;
						}
						else if(message.header.keylen > 0) {
							_key = new Buffer(message.header.keylen);
							_parser.state = constants.parser.state.KEY;
						}
						else if(message.header.bodylen) {
							if(!_parser.chunked) _body = new Buffer(message.header.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
						}
						loc = 0;
						toparse = message.header.bodylen;
					}
					else {
						_header[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.parser.state.EXTRA:
					if(loc == message.header.exlen - 1) {
						message.extras = {};
						_extras[loc++] = buffer[pos];
						switch(message.header.opcode)
						{
							case constants.opcodes.INCREMENT:
							case constants.opcodes.DECREMENT:
								obj = _extras.unpack("NNNNN", 0);
								message.extras.deltahi = obj[0];
								message.extras.deltalo = obj[1];
								message.extras.initialhi = obj[2];
								message.extras.initiallo = obj[3];
								message.extras.expires = obj[4];
								break;
							case constants.opcodes.GET:
							case constants.opcodes.GETQ:
							case constants.opcodes.GETK:
							case constants.opcodes.GETKQ:
								obj = _extras.unpack("N", 0);
								message.extras.flags = obj[0];
								break;
							case constants.opcodes.FLUSH:
							case constants.opcodes.FLUSHQ:
								obj = _extras.unpack("N", 0);
								message.extras.expires = obj[0];
								break;
							case constants.opcodes.SET:
							case constants.opcodes.ADD:
							case constants.opcodes.REPLACE:
								obj = _extras.unpack("NN", 0);
								message.extras.flags = obj[0];
								message.extras.expires = obj[1];
								break;
							default:
								break;
						}
						if(_parser.onExtras) _parser.onExtras(message);
						if(message.header.keylen > 0) {
							_key = new Buffer(message.header.keylen);
							_parser.state = constants.parser.state.KEY;
						}
						else if(message.header.bodylen > 0) {
							if(!_parser.chunked) _body = new Buffer(message.header.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
							_parser.state = constants.parser.state.HEADER;
						}
						_extras = null;
						loc = 0;
					}
					else {
						_extras[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.parser.state.KEY:
					if(loc == message.header.keylen - 1) {
						_key[loc++] = buffer[pos];
						start += message.header.keylen;
						message.key = _key.toString();
						if(_parser.onKey) _parser.onKey(message);
						if(message.header.bodylen > 0) {
							if(!_parser.chunked) _body = new Buffer(message.header.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
							_parser.state = constants.parser.state.HEADER;
						}
						loc = 0;
						_key = null;
					}
					else {
						_key[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.parser.state.BODY:
					if(!_parser.chunked) {
						if(loc == message.header.bodylen - 1) {
							_body[loc++] = buffer[pos];
							switch(_parser.encoding) {
								case constants.encodings.ASCII:
									message.body = _body.toString("ascii");
									break;
								case constants.encodings.UTF8:
									message.body = _body.toString("utf8");
									break;
								case constants.encodings.BINARY:
									message.body = _body;
									break;
								default:
									message.body = _body;
									break;
							}
							if(_parser.onMessage) _parser.onMessage(message);
							_parser.state = constants.parser.state.HEADER;
							loc = 0;
						}
						else {
							_body[loc++] = buffer[pos];
						}
						pos++;
					}
					else {
						if(end >= pos + toparse) {
							if(_parser.onBody) _parser.onBody(buffer, pos, pos+toparse);
							if(_parser.onMessage) _parser.onMessage(message);
							_parser.state = constants.parser.state.HEADER;
							pos += toparse;
							toparse = 0;
							loc = 0;
						}
						else {
							if(_parser.onBody) _parser.onBody(buffer, pos, end);
							toparse -= (end - pos);
							pos = end;
						}
					}
					break;
			}
		}
	}
}

exports.parser = Parser;
exports.constants = constants;