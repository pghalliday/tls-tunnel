var https = require('https'),
    tunnel = require('./Tunnel'),
    fs = require('fs');

var HOST = '127.0.0.1';
var DOWNSTREAM_PORT = 8080;
var PROXY_PORT = 8081;
var UPSTREAM_PORT = 8082;

var SERVER_KEY = fs.readFileSync('../keys/unknown-server-key.pem');
var SERVER_CERT = fs.readFileSync('../keys/unknown-server-cert.pem');

var TUNNEL_OPTIONS = {
  host: HOST,
  downstreamPort: DOWNSTREAM_PORT,
  proxyPort: PROXY_PORT,
  upstreamPort: UPSTREAM_PORT
};

var downstreamServer = https.createServer({
  key: SERVER_KEY,
  cert: SERVER_CERT
}, function(req, res) {
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
    https.get('https://' + HOST + ':' + UPSTREAM_PORT, function(res) {
      // NB. This comes back with a 404 without even hitting the
      // downstream server :s
      // TODO: invetsigate this problem
      console.log('https.get:response:statusCode:' + res.statusCode);
      res.on('data', function(data) {
        console.log('https.get:response:data:' + data);
      });
      res.on('end', function() {
        console.log('https.get:response:end');
      });
    });
  });
});
