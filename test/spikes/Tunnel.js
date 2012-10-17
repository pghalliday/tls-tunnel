module.exports.start = function(options, callback) {
  var tls = require('tls'),
      net = require('net'),
      fs = require('fs');

  var proxyClient;  // connects to downstream and proxy servers and pipes data between them 

  var upstreamServer; // upstream server accepting connections publicly
  var upstreamServerConnection; // other end of upstreamConnection

  var proxyServer; // secured tunnel accepting connections from proxyClient
  var proxyServerConnection; // other end of proxyClient.proxyConnection

  var HOST = options.host;
  var DOWNSTREAM_PORT = options.downstreamPort;
  var PROXY_PORT = options.proxyPort;
  var UPSTREAM_PORT = options.upstreamPort;

  var SERVER_KEY = fs.readFileSync('../keys/server-key.pem');
  var SERVER_CERT = fs.readFileSync('../keys/server-cert.pem');
  var CLIENT_KEY = fs.readFileSync('../keys/client-key.pem');
  var CLIENT_CERT = fs.readFileSync('../keys/client-cert.pem');

  var PROXY_CLIENT_OPTIONS = {
      proxyHost: HOST,
      proxyPort: PROXY_PORT,
      key: CLIENT_KEY,
      cert: CLIENT_CERT,
      ca: [SERVER_CERT],
      downstreamHost: HOST,
      downstreamPort: DOWNSTREAM_PORT
  };

  var ProxyClient = function(options, callback) {
    var self = this;
    self.proxyConnection = tls.connect({
      host: options.proxyHost,
      port: options.proxyPort,
      key: options.key,
      cert: options.cert,
      ca: options.ca,
      rejectUnauthorized: true    
    }, function(error) {
      console.log('ProxyClient.proxyConnection:connect');
      self.downstreamConnection = net.connect({
        host: options.downstreamHost,
        port: options.downstreamPort
      }, function() {
        console.log('ProxyClient.downstreamConnection:connect');
        self.proxyConnection.pipe(self.downstreamConnection);
        self.downstreamConnection.pipe(self.proxyConnection);
        callback();
      });
      self.downstreamConnection.on('error', function(error) {
        console.log('ProxyClient.downstreamConnection:error:' + error);
        self.proxyConnection.on('end', function() {
          callback(new Error('Failed to connect to downstream server: ' + error));
        });
        self.proxyConnection.end();
      });
    });
    self.proxyConnection.on('error', function(error) {
      console.log('ProxyClient.proxyConnection:error:' + error);
      callback(new Error('Failed to connect to proxy server: ' + error));
    });
  };

  var proxyServer = tls.createServer({
    key: SERVER_KEY,
    cert: SERVER_CERT,
    ca: [CLIENT_CERT],
    requestCert: true,
    rejectUnauthorized: true    
  });
  proxyServer.on('error', function(error) {
    console.log('proxyServer:error:' + error);
  });
  proxyServer.on('secureConnection', function(connection) {
    console.log('proxyServer:connection:' + connection);
    proxyServerConnection = connection;
    proxyServerConnection.on('error', function(error) {
      console.log('proxyServerConnection:error:' + error);
    });
    upstreamServerConnection.pipe(proxyServerConnection);
    proxyServerConnection.pipe(upstreamServerConnection);
  });

  var upstreamServer = net.createServer();
  upstreamServer.on('error', function(error) {
    console.log('upstreamServer:error:' + error);
  });
  upstreamServer.on('connection', function(connection) {
    console.log('upstreamServer:connection:' + connection);
    upstreamServerConnection = connection;
    upstreamServerConnection.on('error', function(error) {
      console.log('upstreamServerConnection:error:' + error);
    });
    upstreamServerConnection.pause();
    proxyClient = new ProxyClient(PROXY_CLIENT_OPTIONS, function(error) {
      if (error) {
        console.log('upstreamServer:proxyClient:' + error);
        upstreamServerConnection.end();
      } else {
        upstreamServerConnection.resume();
      }
    });
  });

  proxyServer.listen(PROXY_PORT, function() {
    console.log('proxyServer:listen');
    upstreamServer.listen(UPSTREAM_PORT, function() {
      console.log('upstreamServer:listen');
      callback();
    });
  });
};

