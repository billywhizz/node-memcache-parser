var binary = require("../lib/binary");
var bin = new binary.Binary();
var sys = require("sys");

var iter = 1000000;

var buff = new Buffer(647 * iter);

var key = "hello";
var record = [
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
];

var bytes = 0;
var recs = 0;
var then = new Date().getTime();

for(var i=0; i<iter; i++) {
/*
	var rec = JSON.stringify(record);
	buff.write(rec, bytes);
	bytes += rec.length;
*/
	bytes += bin.pack(record, buff, bytes);
	recs++;
}

var now = new Date().getTime();
var time = (now-then)/1000;
sys.puts("Recs: " + recs + ", Time: " + time + ", Bytes: " + bytes + ", Rec/Sec: " + recs/time + ", MBit/sec: " + parseInt((((bytes)/time)*8)/(1024*1024)));

