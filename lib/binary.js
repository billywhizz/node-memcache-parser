function Binary() {
}

var int_sym = "int";
var int16_sym = "int16";
var int32_sym = "int32";
var string_sym = "string";

Buffer.prototype.pack = function(fields, offset) {
	var e = fields.length + 1;
	var i = offset;
	var next = 0;
	while(--e) {
		var field = fields[next++];
		if(string_sym in field) {
			this.asciiWrite(field.string, i);
			i += field.string.length;
		}
		else if(int_sym in field) {
			this[i++] = field.int & 0xff;
		}
		else if(int16_sym in field) {
			this[i++] = (field.int16 >> 8) & 0xff;
			this[i++] = field.int16 & 0xff;
		}
		else if(int32_sym in field) {
			this[i++] = (field.int32 >> 24) & 0xff;			
			this[i++] = (field.int32 >> 16) & 0xff;
			this[i++] = (field.int32 >> 8) & 0xff;
			this[i++] = field.int32 & 0xff;
		}
	}
	return (i - offset);
}

Buffer.prototype.unpack = function(pattern, offset) {
	var len = pattern.length;
	var i = offset;
	var pi = 0;
	var res = [];
	while(pi < len) {
		switch(pattern[pi]) {
			case "N":
				res.push((this[i++] << 24) + (this[i++] << 16) + (this[i++] << 8) + this[i++]);
				pi++;
				break;
			case "n":
				res.push((this[i++] << 8) + this[i++]);
				pi++;
				break;
			case "o":
				res.push(this[i++]);
				pi++;
				break;
			case "s":
			case "a":
				var slen = 1;
				var tmp = 0;
				while(true) {
					tmp = pattern[pi + slen];
					if(!(tmp >= "0" && tmp <= "9")) {
						break;
					}
					slen++;
				}
				var strlen = parseInt(pattern.substring(pi + 1, pi + slen));
				res.push(this.asciiSlice(i, i+strlen));
				i += strlen;
				pi += slen;
				break;
			case "u":
				break;
		}
	}
	return res;
}

Binary.prototype.pack = function(fields, buff, offset) {
	return buff.pack(fields, offset);
}

Binary.prototype.unpack = function(pattern, offset, buff) {
	return buff.unpack(pattern, offset);
}
exports.Binary = Binary;