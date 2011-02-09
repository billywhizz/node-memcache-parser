var sys = require("sys");
var memc = require("../lib/client");

var client = new memc.Connection();

client.parser.chunked = false;
client.parser.encoding = memc.constants.encodings.UTF8;

var key = "node-memcached-test";
var value = "hello";

/*
{"method": "connect", "params":"port, host, cb"}
{"method": "get", "params":"key, cb"}
{"method": "getq", "params":"key, cb"}
{"method": "getk", "params":"key, cb"}
{"method": "getkq", "params":"key, cb"}
{"method": "set", "params":"key, value, flags, expiration, cb"}
{"method": "setq", "params":"key, value, flags, expiration, cb"}
{"method": "add", "params":"key, value, flags, expiration, cb"}
{"method": "addq", "params":"key, value, flags, expiration, cb"}
{"method": "replace", "params":"key, value, flags, expiration, cb"}
{"method": "replaceq", "params":"key, value, flags, expiration, cb"}
{"method": "inc", "params":"key, delta, initial, expiration, cb"}
{"method": "dec", "params":"key, delta, initial, expiration, cb"}
{"method": "incq", "params":"key, delta, initial, expiration, cb"}
{"method": "decq", "params":"key, delta, initial, expiration, cb"}
{"method": "delete", "params":"key, cb"}
{"method": "deleteq", "params":"key, cb"}
{"method": "append", "params":"key, value, cb"}
{"method": "prepend", "params":"key, value, cb"}
{"method": "appendq", "params":"key, value, cb"}
{"method": "prependq", "params":"key, value, cb"}
{"method": "quit", "params":"cb"}
{"method": "quitq", "params":"cb"}
{"method": "version", "params":"cb"}
{"method": "stat", "params":"key, cb"}
{"method": "noop", "params":"cb"}
{"method": "flush", "params":"expiration, cb"}
{"method": "flushq", "params":"expiration, cb"}
*/

client.connect("/tmp/qsrv.1.sock", null, function() {
	sys.puts("connected");
	client.flush(null, function(message) {
		sys.puts("FLUSH: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
	});
	client.version(function(message) {
		sys.puts("VERSION: " + message.body);
	});
	client.noop(function(message) {
		sys.puts("NOOP: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
	});
	client.set(key, value, 0x01, 3600, function(message) {
		if(message.header.status == memc.constants.status.NO_ERROR) {
			sys.puts("SET: OK");
			client.getq(key, function(message) {
				sys.puts("GETQ: " + message.body);
			});
			client.getkq(key, function(message) {
				sys.puts("GETKQ: " + message.body);
			});
			client.getk(key, function(message) {
				sys.puts("GETK: " + message.body);
			});
			client.get(key, function(message) {
				sys.puts("GET: " + message.body);
				var stat = {};
				client.stat(null, function(message) {
					if(message.header.bodylen > 0) {
						stat[message.key] = message.body;
					}
					else {
						sys.puts("STAT:\n" + JSON.stringify(stat, null, "\t"));
						client.delete(key, function(message) {
							sys.puts("DELETE: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
							client.quit(function(message) {
								sys.puts("QUIT: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
							});
						});
					}
				});
			});
		}
		else {
			sys.puts("SET: Error = " + message.header.status);
		}
	});
});

client.on("error", function(err) {
	sys.puts("client error\n" + JSON.stringify(err, null, "\t"));
});

client.on("close", function() {
	sys.puts("client closed");
});

