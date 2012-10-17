var http = require('http'),
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

var downstreamServer = http.createServer(function(req, res) {
  console.log('downstreamServer:request:' + req);
  res.end('Hello');
});
downstreamServer.on('error', function(error) {
  console.log('httpServer:error:' + error);
});

downstreamServer.listen(DOWNSTREAM_PORT, function() {
  console.log('downstreamServer:listen');
  tunnel.start(TUNNEL_OPTIONS, function() {
    console.log('tunnel:start');
    http.get('http://' + HOST + ':' + UPSTREAM_PORT, function(res) {
      console.log('http.get:response:statusCode:' + res.statusCode);
      res.on('data', function(data) {
        console.log('http.get:response:data:' + data);
      });
      res.on('end', function() {
        console.log('http.get:response:end');
      });
    });
  });
});
