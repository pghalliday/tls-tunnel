var https = require('https'),
    tls = require('tls'),
    net = require('net'),
    fs = require('fs'),
    NET_PORT = 8080,
    HTTPS_PORT = 8081;
    TLS_PORT = 8082;

// This is pretty much the same as the real implementation except
// it doesn't use pause and resume... Oh and it works :s

var httpsServer = https.createServer({
  key: fs.readFileSync('./test/keys/unknown-server-key.pem'),
  cert: fs.readFileSync('./test/keys/unknown-server-cert.pem'),
}, function(req, res) {
  res.end('Hello');
});
httpsServer.listen(HTTPS_PORT, function() {
  var netConnection = net.connect({
    host: '127.0.0.1',
    port: HTTPS_PORT
  }, function() {
    var tlsServer = tls.createServer({
      key: fs.readFileSync('./test/keys/server-key.pem'),
      cert: fs.readFileSync('./test/keys/server-cert.pem'),
      ca: [fs.readFileSync('./test/keys/client-cert.pem')],
      requireCert: true,
      rejectUnauthorized: true  
    });
    tlsServer.listen(TLS_PORT, function() {
      tlsServer.on('secureConnection', function(connection) {
        var internalConnection = connection;
        var netServer = net.createServer();
        netServer.listen(NET_PORT, function() {
          netServer.on('connection', function(connection) {
            internalConnection.pipe(connection);
            connection.pipe(internalConnection);
          });
          https.get('https://127.0.0.1:' + NET_PORT, function(res) {
            console.log('response status code: ' + res.statusCode);
            res.on('data', function(data) {
              console.log('response data: ' + data);
            });
            res.on('end', function() {
              netServer.close(function() {
                tlsServer.close(function() {
                  httpsServer.close(function() {
                    console.log('finished');
                  });
                });
              });
            });
          });
        });
      });
      var tlsConnection = tls.connect({
        host: '127.0.0.1',
        port: TLS_PORT,
        key: fs.readFileSync('./test/keys/client-key.pem'),
        cert: fs.readFileSync('./test/keys/client-cert.pem'),
        ca: [fs.readFileSync('./test/keys/server-cert.pem')],
        rejectUnauthorized: true          
      }, function() {
        tlsConnection.pipe(netConnection);
        netConnection.pipe(tlsConnection);
      });
    });
  });
});
