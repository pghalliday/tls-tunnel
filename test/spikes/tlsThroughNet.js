var tls = require('tls'),
    net = require('net'),
    fs = require('fs'),
    NET_PORT = 8080,
    TLS_PORT = 8081;

var tlsServer = tls.createServer({
  key: fs.readFileSync('./test/keys/unknown-server-key.pem'),
  cert: fs.readFileSync('./test/keys/unknown-server-cert.pem'),
  ca: [fs.readFileSync('./test/keys/unknown-client-cert.pem')],
  requireCert: true,
  rejectUnauthorized: true  
});
tlsServer.listen(TLS_PORT, function() {
  tlsServer.on('secureConnection', function(connection) {
    connection.setEncoding('utf8');
    connection.on('data', function(data) {
      console.log(data)
      connection.end('Goodbye');
    });
  });
  var netConnection = net.connect({
    host: '127.0.0.1',
    port: TLS_PORT
  }, function() {
    var netServer = net.createServer();
    netServer.listen(NET_PORT, function() {
      netServer.on('connection', function(connection) {
        connection.pipe(netConnection);
        netConnection.pipe(connection);
      })
      var tlsConnection = tls.connect({
        host: '127.0.0.1',
        port: NET_PORT,
        key: fs.readFileSync('./test/keys/unknown-client-key.pem'),
        cert: fs.readFileSync('./test/keys/unknown-client-cert.pem'),
        ca: [fs.readFileSync('./test/keys/unknown-server-cert.pem')],
        rejectUnauthorized: true
      }, function() {
        tlsConnection.setEncoding('utf8');
        tlsConnection.on('data', function(data) {
          console.log(data)
        });
        tlsConnection.on('end', function() {
          netServer.close(function() {
            tlsServer.close(function() {
              console.log('Finished');
            })
          });
        });
        tlsConnection.write('Hello');
      });
    });
  });
});
