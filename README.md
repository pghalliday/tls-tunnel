node-tls-tunnel
===============

A Node.js client/server implementation of a secure tunnel over TLS/SSL. Useful for exposing local servers on public hosts. Initially implemented to expose a local server to browsers provided by [BrowserStack](http://www.browserstack.com) to integrate their beta API with test scripts.

The idea is simple.

- A server runs on a public host accepting connections on a public host name, let's say "mytlstunnel.com"
- Initially only one port will be open and accepting connections, eg. 8080
- On your local machine you start a client that connects to mytlstunnel.com:8080 using a TLS socket and let it know what local port it should expose, eg. 8000
- The server assigns another port for use with that client and starts listening on it using an ordinary net socket, notifying the client on which port it will listen, eg 8081
- When a third party tries to connect to mytlstunnel.com:8081 the server asks the client to make another connection using TLS to handle the traffic going through mytlstunnel.com:8081
- The client does this and pipes all traffic to and from the third party on mytlstunnel.com:8081 and localhost:8000

## Features

- Can be used to tunnel HTTP or raw sockets
- Can specify any host and port to forward to that is reachable by the client
- Servers and clients can be instantiated within Node.js contexts
- Servers can be configured to only accept connections from known clients (using SSL certificates), preventing strangers using your resources
- Clients can be configured to validate against a known list of servers (using SSL certificates), preventing anyone from masquerading as your server
- Servers can be configured to expose a predefined set of ports

## Installation

```
npm install tls-tunnel
```

## API

To instantiate and start a server 

```javascript
var fs = require('fs');
var Server = require('tls-tunnel').Server;

var server = new Server({
  port: 8080,	// port to listen for client connections
  key: fs.readFileSync('./keys/server-key.pem'), 	// server's private key
  cert: fs.readFileSync('./keys/server-cert.pem'),	// server's SSL certificate
  ca: [fs.readFileSync('./keys/client-cert.pem')],	// list of authorized client SSL certificates
  forwardedPorts: {
    start: 8081,	// Start of port range to assign to connecting clients
    count: 10		// maximum number of ports and hence clients that can be supported
  },
  timeout: 5000	// Timeout in milliseconds to use when waiting for a client to provide a tunnel connection (default is 2000)
});

server.start(function() {
  // server should be listening on port 8080 now
  server.stop(function() {
    // server should have ended all connections and stopped
  });
});
```

To instantiate and connect a client

```javascript
var fs = require('fs');
var http = require('http');
var Client = require('tls-tunnel').Client;

var client = new Client({
  tunnel: {
    host: 'mytlstunnel.com',  // the host where the server is running
    port: 8080,               // the port on which the server is running
    key: fs.readFileSync('./keys/client-key.pem'),    // client's private key
    cert: fs.readFileSync('./keys/client-cert.pem'),  // client's SSL certificate
    ca: [fs.readFileSync('./keys/server-cert.pem')]   // list of authorized server SSL certificates
  },
  target: {
    host: 'localhost',  // the target host to expose through the tunnel
    port: 8000,         // the target port to expose through the tunnel
  },
  timeout: 5000	// Timeout in milliseconds to use when waiting for a server to assign a public port (default is 2000)
});

client.connect(function(error, port) {
  if (error) {
    // errors could include not having enough ports available on
    // the server to support another
  } else {
    // only if no errors were encountered will the <port> parameter
    // contain the public port that was assigned for the tunnel
    http.get('http://mytlstunnel.com:' + port, function(res) {
      res.on('data', function() {
        // should receive the response from localhost:8000 here 
        // (if it's listening of course)
      });
      res.on('end', function() {
        client.disconnect(function() {
          // client should have ended all connections
        });
      });
    });
  }
});
```

## Hints on generating certs for testing

See the ``test/keys`` folder for certificates used by the tests. These can be regenerated at anytime using either ``keys.sh`` (OSX, Linux) or ``keys.bat`` (Windows). These scripts use [OpenSSL](http://www.openssl.org). OSX and Linux most likely already ship with OpenSSL. If using Windows you will need to install [OpenSSL](http://slproweb.com/products/Win32OpenSSL.html) first.

It should be noted that for the client to authorize server certificates they need to have the correct hosts listed as altnames in the v3 extensions (although this doesn't seem to be required on Windows).

## Roadmap

- Test keys and certs need to be generated when running tests as they will eventually expire
- Tunnel should support TLS and HTTPS traffic
- Client should be configurable to only accept a limited number of connections
- Server or client should be runnable from the shell

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using ``./grunt.sh`` or ``.\grunt.bat``.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Peter Halliday  
Licensed under the MIT license.