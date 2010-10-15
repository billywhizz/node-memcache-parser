var sys = require("sys");
var binary = require("../lib/binary");
var assert = require("assert");

var buff = new Buffer(4096);
var bin = new binary.Binary();

function getSize(message) {
	var len = 0;
	message.forEach(function(field) {
		if(field.int16) {
			len += 2;
		}
		if(field.int32) {
			len += 4;
		}
		if(field.int) {
			len++;
		}
		if(field.string) {
			len += field.string.length;
		}
	});
	return len;
}

var record = [
	{"int": 0},
	{"int": 1},
	{"int": 255},
	{"int16": 0},
	{"int16": 1},
	{"int16": 255},
	{"int16": 256},
	{"int16": 65535},
	{"int32": 0},
	{"int32": 128},
	{"string": "goodbye"},
	{"int32": 65535},
	{"string": "0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"},
	{"int32": 65536}
];

function unpack(buff) {
	var tmp = bin.unpack("ooonnnnnNNs7Ns100N", 0, buff);
	return [
		{"int": tmp[0]},
		{"int": tmp[1]},
		{"int": tmp[2]},
		{"int16": tmp[3]},
		{"int16": tmp[4]},
		{"int16": tmp[5]},
		{"int16": tmp[6]},
		{"int16": tmp[7]},
		{"int32": tmp[8]},
		{"int32": tmp[9]},
		{"string": tmp[10]},
		{"int32": tmp[11]},
		{"string": tmp[12]},
		{"int32": tmp[13]}
	];
}

size = bin.pack(record, buff, 0);
//assert.equal(size, getSize(record));
buff = buff.slice(0, size);
sys.puts(sys.inspect(record, true, 100));
sys.puts(sys.inspect(unpack(buff), true, 100));
assert.deepEqual(record, unpack(buff));