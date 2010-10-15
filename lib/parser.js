var sys = require("sys");

var constants = {
	"opcodes": {
		"Get": 0x00,
		"Set": 0x01,
		"Add": 0x02,
		"Replace": 0x03,
		"Delete": 0x04,
		"Increment": 0x05,
		"Decrement": 0x06,
		"Quit": 0x07,
		"Flush": 0x08,
		"GetQ": 0x09,
		"No-op": 0x0A,
		"Version": 0x0B,
		"GetK": 0x0C,
		"GetKQ": 0x0D,
		"Append": 0x0E,
		"Prepend": 0x0F,
		"Stat": 0x10,
		"SetQ": 0x11,
		"AddQ": 0x12,
		"ReplaceQ": 0x13,
		"DeleteQ": 0x14,
		"IncrementQ": 0x15,
		"DecrementQ": 0x16,
		"QuitQ": 0x17,
		"FlushQ": 0x18,
		"AppendQ": 0x19,
		"PrependQ": 0x1A
	},
	"general": {
		"MEMC_HEADER_LEN": 24,
		"MEMC_MAX_BODY": 16384,
		"MEMC_MAGIC": {
			"request": 0x80,
			"response": 0x81
		}
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
		"NO_ERROR": 0,
		"KEY_NOT_FOUND": 1,
		"KEY_EXISTS": 2,
		"VALUE_TOO_LARGE": 3,
		"INVALID_ARGUMENTS": 4,
		"ITEM_NOT_STORED": 5,
		"INCR_DECR_NON_NUMERIC": 6
	}
};

function Parser() {
	var _parser = this;
	var loc = 0;
	var message = {};
	
	var _header = new Buffer(constants.general.MEMC_HEADER_LEN);
	var _extras = null;
	var _key = null;
	var _body = null;
	var toparse = 0;
	
	_parser.chunked = true;
	
	_parser.state = constants.parser.state.HEADER;
	_parser.onMessage = _parser.onError = _parser.onHeader = _parser.onBody = null;

	_parser.execute = function(buffer) {
		var pos = 0;
		while (pos < buffer.length) {
			switch(_parser.state) {
				case constants.parser.state.HEADER:
					if(loc == constants.general.MEMC_HEADER_LEN - 1) {
						message = {};
						_header[loc++] = buffer[pos];
						var obj = _header.unpack("oonoonNNNN", 0);
						message.magic = obj[0];
						message.opcode = obj[1];
						message.keylen = obj[2];
						message.exlen = obj[3];
						message.datatype = obj[4];
						message.status = obj[5];
						message.totlen = obj[6];
						message.opaque = obj[7];
						message.cashi = obj[8];
						message.caslo = obj[9];
						message.bodylen = message.totlen - (message.exlen + message.keylen);
						
						if(_parser.onHeader) _parser.onHeader(message);
						if(message.exlen > 0) {
							_extras = new Buffer(message.exlen);
							_parser.state = constants.parser.state.EXTRA;
						}
						else if(message.keylen > 0) {
							_key = new Buffer(message.keylen);
							_parser.state = constants.parser.state.KEY;
						}
						else if(message.totlen - (message.keylen + message.exlen) > 0) {
							if(!_parser.chunked) _body = new Buffer(message.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
						}
						loc = 0;
						toparse = message.bodylen;
					}
					else {
						_header[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.parser.state.EXTRA:
					if(loc == message.exlen - 1) {
						_extras[loc++] = buffer[pos];
						switch(message.opcode)
						{
							case 0x05:
							case 0x06:
								obj = _extras.unpack("NNNNN", 0);
								message.deltahi = obj[0];
								message.deltalo = obj[1];
								message.initialhi = obj[2];
								message.initiallo = obj[3];
								message.expires = obj[4];
								break;
							case 0x00:
								obj = _extras.unpack("N", 0);
								message.flags = obj[0];
								break;
							case 0x08:
							case 0x18:
								obj = _extras.unpack("N", 0);
								message.expires = obj[0];
								break;
							case 0x01:
							case 0x02:
							case 0x03:
								obj = _extras.unpack("NN", 0);
								message.flags = obj[0];
								message.expires = obj[1];
								break;
							default:
								break;
						}
						if(message.keylen > 0) {
							_key = new Buffer(message.keylen);
							_parser.state = constants.parser.state.KEY;
						}
						else if(message.bodylen > 0) {
							if(!_parser.chunked) _body = new Buffer(message.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
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
					if(loc == message.keylen - 1) {
						_key[loc++] = buffer[pos];
						start += message.keylen;
						message.key = _key.toString();
						if(message.bodylen > 0) {
							if(!_parser.chunked) _body = new Buffer(message.bodylen);
							_parser.state = constants.parser.state.BODY;
						}
						else {
							if(_parser.onMessage) _parser.onMessage(message);
							loc = 0;
						}
						_key = null;
					}
					else {
						_key[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.parser.state.BODY:
					if(!_parser.chunked) {
						if(loc == message.bodylen - 1) {
							_body[loc++] = buffer[pos];
							message.body = _body.toString();
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
						if(buffer.length >= pos + toparse) {
							if(_parser.onBody) _parser.onBody(buffer.slice(pos, pos+toparse));
							pos += toparse;
							toparse = 0;
							_parser.state = constants.parser.state.HEADER;
							if(_parser.onMessage) _parser.onMessage(message);
							loc = 0;
						}
						else {
							if(_parser.onBody) _parser.onBody(buffer.slice(pos, buffer.length));
							toparse -= buffer.length - pos;
							pos = buffer.length;
						}
					}
					break;
			}
		}
	}
}

exports.parser = Parser;
exports.constants = constants;

