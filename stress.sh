echo "bytesin,bytesout,encoding,body,clients,inrate,outrate,recv,send,recv/sec,queued" > chunked.csv
node examples/get-stress.js 10 16 0 100000 true >> chunked.csv
node examples/get-stress.js 10 32 0 100000 true >> chunked.csv
node examples/get-stress.js 10 64 0 100000 true >> chunked.csv
node examples/get-stress.js 10 256 0 100000 true >> chunked.csv
node examples/get-stress.js 10 512 0 100000 true >> chunked.csv
node examples/get-stress.js 10 1024 0 100000 true >> chunked.csv
node examples/get-stress.js 10 2048 0 100000 true >> chunked.csv
node examples/get-stress.js 10 4096 0 100000 true >> chunked.csv
node examples/get-stress.js 10 8192 0 100000 true >> chunked.csv
node examples/get-stress.js 10 16384 0 100000 true >> chunked.csv
node examples/get-stress.js 10 32768 0 100000 true >> chunked.csv
node examples/get-stress.js 10 65536 0 100000 true >> chunked.csv
node examples/get-stress.js 10 131072 0 100000 true >> chunked.csv
node examples/get-stress.js 10 262144 0 100000 true >> chunked.csv
node examples/get-stress.js 10 524288 0 100000 true >> chunked.csv
node examples/get-stress.js 10 1048477 0 100000 true >> chunked.csv