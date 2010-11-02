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

client.connect(process.ARGV[2], null, function() {
	sys.puts("connected");
	client.flushq(null, function(message) {
		// we should only get a callback if there is an error
		sys.puts("FLUSHQ: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
	});
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
				sys.puts("GETKQ: " + message.key + ":" + message.body);
			});
			client.getk(key, function(message) {
				sys.puts("GETK: " + message.key + ":" + message.body);
			});
			client.setq("arse", "bum", 0x01, 3600, function(message) {
				// we should only get a callback if there is an error
				sys.puts("SETQ: " + message.header.status);
			});
			client.getq("arse", function(message) {
				sys.puts("GETQ: " + message.body);
			});
			client.add("arse", "bum", 0x01, 3600, function(message) {
				sys.puts("ADD: " + message.header.status);
			});
			client.add("arse1", "bum", 0x01, 3600, function(message) {
				sys.puts("ADD: " + message.header.status);
			});
			client.addq("arse1", "bum", 0x01, 3600, function(message) {
				// we should only get a callback if there is an error
				sys.puts("ADDQ: " + message.header.status);
			});
			client.replace("arse1", "bum", 0x01, 3600, function(message) {
				sys.puts("REPLACE: " + message.header.status);
			});
			client.replace("arse123", "bum", 0x01, 3600, function(message) {
				sys.puts("REPLACE: " + message.header.status);
			});
			client.replaceq("arse123", "bum", 0x01, 3600, function(message) {
				sys.puts("REPLACEQ: " + message.header.status);
			});
			client.replaceq("arse1", "wee", 0x01, 3600, function(message) {
				sys.puts("REPLACEQ: " + message.header.status);
			});
			client.incq("tester1", 1, 1, 3600, function(message) {
				sys.puts("INCQ: " + message.header.status);
				sys.puts(message.body);
			});
			client.incq("tester1", 2, 0, 3600, function(message) {
				sys.puts("INCQ: " + message.header.status);
				sys.puts(JSON.stringify(message));
			});
			client.inc("tester1", 3, 0, 3600, function(message) {
				sys.puts("INC: " + message.header.status);
				sys.puts(JSON.stringify(message));
			});
			client.decq("tester1", 1, 0, 3600, function(message) {
				sys.puts("DECQ: " + message.header.status);
				sys.puts(JSON.stringify(message));
			});
			client.dec("tester1", 2, 0, 3600, function(message) {
				sys.puts("DEC: " + message.header.status);
				sys.puts(JSON.stringify(message));
			});
			client.deleteq("tester109", function(message) {
				sys.puts("DELETEQ: " + message.header.status);
			});
			client.deleteq("tester1", function(message) {
				sys.puts("DELETEQ: " + message.header.status);
			});
			client.delete("tester1", function(message) {
				sys.puts("DELETE: " + message.header.status);
			});
			client.appendq("arse", "1", function(message) {
				sys.puts("APPENDQ: " + message.header.status);
			});
			client.prependq("arse", "1", function(message) {
				sys.puts("PREPENDQ: " + message.header.status);
			});
			client.append("arse", "2", function(message) {
				sys.puts("APPEND: " + message.header.status);
			});
			client.prepend("arse", "2", function(message) {
				sys.puts("PREPEND: " + message.header.status);
			});
			client.get("arse", function(message) {
				sys.puts("GET: " + message.body);
			});
			client.get(key, function(message) {
				sys.puts(JSON.stringify(message, null, "\t"));
				sys.puts("GET: " + message.body);
				var stat = {};
				client.stat(null, function(message) {
					if(message.header.bodylen > 0) {
						stat[message.key] = message.body;
					}
					else {
						client.delete(key, function(message) {
							sys.puts("DELETE: " + (message.header.status == memc.constants.status.NO_ERROR?"OK":"FAIL"));
							client.quit(function(message) {
								sys.puts("QUIT:\n" + JSON.stringify(message, null, "\t"));
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

