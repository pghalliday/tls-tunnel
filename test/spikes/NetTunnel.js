var net = require('net'),
    tunnel = require('./Tunnel');

var HOST = '127.0.0.1';
var DOWNSTREAM_PORT = 8080;
var PROXY_PORT = 8081;
var UPSTREAM_PORT = 8082;

var TUNNEL_OPTIONS = {
  host: HOST,
  downstreamPort: DOWNSTREAM_PORT,
  proxyPort: PROXY_PORT,
  upstreamPort: UPSTREAM_PORT
};

var downstreamServer = net.createServer();
downstreamServer.on('error', function(error) {
  console.log('downstreamServer:error:' + error);
});
downstreamServer.on('connection', function(connection) {
  console.log('downstreamServer:connection:' + connection);
  downstreamServerConnection = connection;
  downstreamServerConnection.on('error', function(error) {
    console.log('downstreamServerConnection:error:' + error);
  });
  downstreamServerConnection.setEncoding('utf8');
  downstreamServerConnection.on('data', function(data) {
    console.log('downstreamServerConnection:data:' + data);
    downstreamServerConnection.write('Hello, client');
  });
});

downstreamServer.listen(DOWNSTREAM_PORT, function() {
  console.log('downstreamServer:listen');
  tunnel.start(TUNNEL_OPTIONS, function() {
    console.log('tunnel:start');
    var upstreamConnection = net.connect({
      host: HOST,
      port: UPSTREAM_PORT
    }, function() {
      console.log('upstreamConnection:connect');
      upstreamConnection.setEncoding('utf8');
      upstreamConnection.on('data', function(data) {
        console.log('upstreamConnection:data:' + data);
        upstreamConnection.end();
      });
      upstreamConnection.write('Hello, server');
    });
    upstreamConnection.on('error', function(error) {
      console.log('upstreamConnection:error:' + error);
    });
  });
});
