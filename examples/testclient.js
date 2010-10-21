var sys = require("sys");
var memc = require("../lib/client");

var client = new memc.Connection();

client.chunked = false;
client.encoding = memc.constants.encodings.UTF8;

var key = "node-memcached-test";
var value = "hello";

client.connect("/tmp/memcached.sock", null, function() {
	sys.puts("connected");
	client.version(function(message) {
		sys.puts("VERSION: " + message.body);
	});
	client.set(key, value, 0x01, 3600, function(message) {
		if(message.header.status == memc.constants.status.NO_ERROR) {
			sys.puts("SET: OK");
			client.get(key, function(message) {
				sys.puts("GET: " + message.body);
				var stat = {};
				client.stat(function(message) {
					if(message.header.bodylen > 0) {
						stat[message.key] = message.body;
					}
					else {
						sys.puts("STAT:\n" + JSON.stringify(stat, null, "\t"));
						client.quit(function(message) {
							sys.puts("QUIT: " + message.header.status);
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

