# node-memcache-parser

A low level binary protocol parser for memcache.

# About

## Methods

### `execute(Buffer, start, end)`

Parse a buffer

#### Buffer
a node.js Buffer object
#### start
where to start parsing in the buffer
#### end
where to finish parsing in the buffer

### `reset()`

Reset the state of the parser

## Callbacks

### `onHeader(message)


# Example
<code>
var memc = require("../lib/parser");

...

	var current = null;
	
	var parser = new memc.parser({
		"chunked": true,
		"encoding": memc.constants.encodings.BINARY
	});
	
	parser.onMessage = function(message) {
		// Will fire when a message has completed fully (i.e. body has been fully parsed), 
		// even if the message is only a header with no body. This means for a message 
		// that is only a header, you will get it in th onHeader and the onMessage callbacks
		sys.puts("message\n" + JSON.stringify(message, null, "\t"));
		switch(message.header.opcode) {
			case memc.constants.opcodes.SET:
				break;
			case memc.constants.opcodes.GET:
				break;
			case memc.constants.opcodes.QUIT:
				break;
		}
	};

	parser.onHeader = function(message) {
		// Will fire after the header (first 24 bytes) of a message has been parsed.
		sys.puts("header\n" + JSON.stringify(message, null, "\t"));
		switch(message.header.opcode) {
			case memc.constants.opcodes.SET:
				break;
			case memc.constants.opcodes.GET:
				break;
			case memc.constants.opcodes.QUIT:
				break;
		}
		if(message.header.bodylen > 0) {
			if(parser.chunked) {
				// save a pointer to the message in current so we can access it the onBody callback 
				// as we will not get anything in the body when onMessage fires while in chunked mode
				current = message;
				current.body = [];
			}
			else {
				// we will get the body on the message returned in the onMessage callback
			}
		}
	};

	parser.onBody = function(buffer, start, end) {
		// this will only fire if chunked is set to true. the parser will not set the body of 
		// the message and will just forward on the chunks of the body in this callback. 
		// NOTE: the parser does not use Buffer.slice(), it is giving you the actual buffer which was passed into it.
		sys.puts("chunk: " + (end-start));
		current.body.push(buffer.slice(start, end));
	};

	parser.onError = function(err) {
		sys.puts("error\n" + JSON.stringify(err, null, "\t"));
	};
	
...

	stream.ondata = function (buffer, start, end) {
		parser.execute(buffer, start, end);
	};
	
</code>

# Dependencies

For the test script in examples/test.js you need to copy binary.node from this project:

http://github.com/billywhizz/node-binary

to the lib directory so that the binary messages for sending to memcached can be created.