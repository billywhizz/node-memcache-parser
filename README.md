# node-memcache-parser

A low level binary protocol parser for memcache.

# About

## Options/Properties

### `chunked`

true or false. Default is true. 

If true, body of messages will be made available through the onBody callback and will not be allocated on the message object received in the onMessage event. This allows the callee complete control over the bodies of message and keeps allocations at a minimum.

If false, the body will be allocated on the message object as it is parsed. It will be a string if encoding is set to UTF8 or ASCII. it will be an array of Buffer objects if encoding is set to BINARY

### `encoding`

<code>
"encodings": \{
	"BINARY": 0,
	"ASCII": 1,
	"UTF8": 2
\},
</code>

Default is BINARY.

Only applies if chunked is false. When chunked is true, only raw buffers will be made available through the onData event. When chunked is false, encoding will determine whether the body is stored as a utf8/ascii encoded string on the message object or as an array of binary buffers.

## Methods

### `new Parser(options)`

#### options

You can set encoding and chunked by passing the constructor an options object as follows:

<code>
\{
	encoding: 0|1|2,
	chunked: true|false
\}
</code>

### `execute(buffer, start, end)`

Parse a buffer

#### buffer
a node.js Buffer object
#### start
where to start parsing in the buffer
#### end
where to finish parsing in the buffer

### `reset()`

Reset the state of the parser

## Callbacks

### `onHeader(message)`

fired when a header (first 24 bytes of message) has been parsed. more info on header formats [here](http://code.google.com/p/memcached/wiki/MemcacheBinaryProtocol).

At this stage, only the header on the message object will be populated

### `onMessage(message)`

fired when a message has been completely parsed. if the message has a body and chunked = false, you will
now have the body, extras and key available on the message

### `onBody(buffer, start, end)`

fired for each chunk of data being sent to the parser for the current body. this callback will only be
fired if chunked = true.

### `onError(err)`

## Message format

<code>
\{
	[m]header: \{
		magic: int,
		opcode: int,
		keylen: int16,
		exlen: int,
		datatype: int,
		status/reserved: int16,
		totlen: int32,
		opaque: int32,
		cashi: int32,
		caslo: int32,
		bodylen: int32
	\},
	[o]key: string,
	[o]extra: \{\},
	[o]body: string
\}
</code>

# Example
<code>
var memc = require("../lib/parser");

...

	var current = null;
	
	var parser = new memc.parser(\{
		"chunked": true,
		"encoding": memc.constants.encodings.BINARY
	\});
	
	parser.onMessage = function(message) \{
		// Will fire when a message has completed fully (i.e. body has been fully parsed), 
		// even if the message is only a header with no body. This means for a message 
		// that is only a header, you will get it in th onHeader and the onMessage callbacks
		sys.puts("message\n" + JSON.stringify(message, null, "\t"));
		switch(message.header.opcode) \{
			case memc.constants.opcodes.SET:
				break;
			case memc.constants.opcodes.GET:
				break;
			case memc.constants.opcodes.QUIT:
				break;
		\}
	\};

	parser.onHeader = function(message) \{
		// Will fire after the header (first 24 bytes) of a message has been parsed.
		sys.puts("header\n" + JSON.stringify(message, null, "\t"));
		switch(message.header.opcode) \{
			case memc.constants.opcodes.SET:
				break;
			case memc.constants.opcodes.GET:
				break;
			case memc.constants.opcodes.QUIT:
				break;
		\}
		if(message.header.bodylen > 0) \{
			if(parser.chunked) \{
				// save a pointer to the message in current so we can access it the onBody callback 
				// as we will not get anything in the body when onMessage fires while in chunked mode
				current = message;
				current.body = [];
			\}
			else \{
				// we will get the body on the message returned in the onMessage callback
			\}
		\}
	\};

	parser.onBody = function(buffer, start, end) \{
		// this will only fire if chunked is set to true. the parser will not set the body of 
		// the message and will just forward on the chunks of the body in this callback. 
		// NOTE: the parser does not use Buffer.slice(), it is giving you the actual buffer which was passed into it.
		sys.puts("chunk: " + (end-start));
		current.body.push(buffer.slice(start, end));
	\};

	parser.onError = function(err) \{
		sys.puts("error\n" + JSON.stringify(err, null, "\t"));
	\};
	
...

	stream.ondata = function (buffer, start, end) \{
		parser.execute(buffer, start, end);
	\};
	
</code>

# Dependencies

For the test script in examples/test.js you need to copy binary.node from this project:

http://github.com/billywhizz/node-binary

to the lib directory so that the binary messages for sending to memcached can be created.