#include <node.h>
#include <node_buffer.h>
#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>	// isdigit
#include <arpa/inet.h>  // htons, htonl

using namespace v8;
using namespace node;

#define GET_OFFSET(a) (a)->IsInt32() ? (a)->IntegerValue() : -1;
#define OUT_OF_BOUNDS ThrowException(Exception::Error(String::New("Out of bounds")))

class Binary : public ObjectWrap {
	public:
		static void Initialize (v8::Handle<v8::Object> target)
		{
			HandleScope scope;
			Local<FunctionTemplate> t = FunctionTemplate::New(New);
			t->InstanceTemplate()->SetInternalFieldCount(1);
			NODE_SET_PROTOTYPE_METHOD(t, "pack", Pack);
			NODE_SET_PROTOTYPE_METHOD(t, "unpack", Unpack);
			target->Set(String::NewSymbol("Binary"), t->GetFunction());
		}

	protected:

		static Handle<Value> New (const Arguments& args)
		{
			HandleScope scope;
			Binary *binary = new Binary();
			binary->Wrap(args.This());
			return args.This();
		}


		// buffer.unpack(format, index, Buffer);
		// Starting at 'index', unpacks binary from the buffer into an array.
		// 'format' is a string
		//
		//  FORMAT  RETURNS
		//    N     uint32_t   a 32bit unsigned integer in network byte order
		//    n     uint16_t   a 16bit unsigned integer in network byte order
		//    o     uint8_t    a 8bit unsigned integer
		static Handle<Value> Unpack(const Arguments &args) {
			HandleScope scope;
			Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
		
			if (!args[0]->IsString()) {
				return ThrowException(Exception::TypeError(String::New("Argument must be a string")));
			}
			if (!Buffer::HasInstance(args[2])) {
				return ThrowException(Exception::Error(String::New("Second argument should be a Buffer")));
			}
			Buffer * buffer = ObjectWrap::Unwrap<Buffer>(args[2]->ToObject());

			String::AsciiValue format(args[0]->ToString());
			uint32_t index = args[1]->Uint32Value();

			Local<Array> array = Array::New(format.length());

			uint8_t  uint8;
			uint16_t uint16;
			uint32_t uint32;
		
			int pos;
			pos = 0;
			for (int i = 0; i < format.length(); i++) {
				switch ((*format)[i]) {
					// 32bit unsigned integer in network byte order
					case 'N':
						if (index + 3 >= buffer->length()) return OUT_OF_BOUNDS;
						uint32 = htonl(*(uint32_t*)(buffer->data() + index));
						array->Set(Integer::New(pos++), Integer::NewFromUnsigned(uint32));
						index += 4;
						break;
					// 16bit unsigned integer in network byte order
					case 'n':
						if (index + 1 >= buffer->length()) return OUT_OF_BOUNDS;
						uint16 = htons(*(uint16_t*)(buffer->data() + index));
						array->Set(Integer::New(pos++), Integer::NewFromUnsigned(uint16));
						index += 2;
						break;
					// a single octet, unsigned.
					case 'o':
						if (index >= buffer->length()) return OUT_OF_BOUNDS;
						uint8 = (uint8_t)buffer->data()[index];
						array->Set(Integer::New(pos++), Integer::NewFromUnsigned(uint8));
						index += 1;
						break;
					case 's':
						char num[32];
						int j;
						j=0;
						while(isdigit((*format)[++i])) {
							num[j++] = (*format)[i];
						}
						num[j] = '\0';
						int size;
						size = atoi(num);
						if (index + size > buffer->length()) return OUT_OF_BOUNDS;
						// read string
						char * newstr;
						newstr = (char*)malloc(size + 1);
						strncpy(newstr, buffer->data() + index, size);
						*(newstr+size) = '\0';
						array->Set(Integer::New(pos++), String::New(newstr));
						index += size;
						free(newstr);
						i--;
						break;
					default:
						return ThrowException(Exception::Error(String::New("Unknown format character")));
				}
			}
			return scope.Close(array);
		}

		static Handle<Value> Pack (const Arguments& args)
		{
			HandleScope scope;
			Binary *binary = ObjectWrap::Unwrap<Binary>(args.This());
			
			if (!args[0]->IsArray()) {
				return ThrowException(Exception::Error(String::New("First argument should be an Array")));
			}
			if (!Buffer::HasInstance(args[1])) {
				return ThrowException(Exception::Error(String::New("Second argument should be a Buffer")));
			}
			
			Buffer * buffer = ObjectWrap::Unwrap<Buffer>(args[1]->ToObject());
			size_t off = args[2]->Int32Value();
			size_t len = buffer->length();
			if (off >= len) {
				return OUT_OF_BOUNDS;
			}

			char * start = (char*)buffer->data();
			char * buf = start + off;

			Local<Array> a = Local<Array>::Cast(args[0]);
			int val = 0;
			for (int i = 0; i < a->Length(); i++) {
				v8::Handle<v8::Object> fields = a->Get(i)->ToObject();
				v8::Handle<v8::Array> props = fields->GetPropertyNames();
				v8::String::Utf8Value type(props->Get(0));
				Handle<String> name = props->Get(0)->ToString();
				val = 0;
				if(strcmp(*type, "int16") == 0) {
					val = (int) fields->Get(name)->ToInteger()->Value();
					*buf++ = (0xff00 & val) >> 8;
					*buf++ = 0xff & val;
				}
				else if(strcmp(*type, "int32") == 0) {
					val = (int) fields->Get(name)->ToInteger()->Value();
					*buf++ = (0xff000000 & val) >> 24;
					*buf++ = (0xff0000 & val) >> 16;
					*buf++ = (0xff00 & val) >> 8;
					*buf++ = 0xff & val;
				}
				else if(strcmp(*type, "int") == 0) {
					*buf++ = fields->Get(name)->ToInteger()->Value();
				}
				else if(strcmp(*type, "string") == 0) {
					String::Utf8Value value(fields->Get(name));
					strcpy(buf, *value);
					buf += value.length();
				}
				else {
					return ThrowException(Exception::Error(String::New("Unknown Type")));
				}
			}
			Local<Integer> length = Integer::New(buf-(start+off));
			return scope.Close(length);
		}

		Binary () : ObjectWrap () 
		{
		}

		~Binary ()
		{
		}
};

extern "C" void
init (Handle<Object> target) 
{
  HandleScope scope;
  Binary::Initialize(target);
}
