var tls = require('tls'),
    net = require('net'),
    fs = require('fs'),
    NET_PORT = 8080,
    TLS_PORT_1 = 8081;
    TLS_PORT_2 = 8082;

// This is pretty much the same as the real implementation except
// it doesn't use pause and resume... Oh and it works :s

var tlsServer1 = tls.createServer({
  key: fs.readFileSync('./test/keys/unknown-server-key.pem'),
  cert: fs.readFileSync('./test/keys/unknown-server-cert.pem'),
  ca: [fs.readFileSync('./test/keys/unknown-client-cert.pem')],
  requireCert: true,
  rejectUnauthorized: true  
});
tlsServer1.listen(TLS_PORT_1, function() {
  tlsServer1.on('secureConnection', function(connection) {
    connection.setEncoding('utf8');
    connection.on('data', function(data) {
      console.log(data)
      connection.end('Goodbye');
    });
  });
  var netConnection = net.connect({
    host: '127.0.0.1',
    port: TLS_PORT_1
  }, function() {
    var tlsServer2 = tls.createServer({
      key: fs.readFileSync('./test/keys/server-key.pem'),
      cert: fs.readFileSync('./test/keys/server-cert.pem'),
      ca: [fs.readFileSync('./test/keys/client-cert.pem')],
      requireCert: true,
      rejectUnauthorized: true  
    });
    tlsServer2.listen(TLS_PORT_2, function() {
      tlsServer2.on('secureConnection', function(connection) {
        var internalConnection = connection;
        var netServer = net.createServer();
        netServer.listen(NET_PORT, function() {
          netServer.on('connection', function(connection) {
            internalConnection.pipe(connection);
            connection.pipe(internalConnection);
          });
          var tlsConnection1 = tls.connect({
            host: '127.0.0.1',
            port: NET_PORT,
            key: fs.readFileSync('./test/keys/unknown-client-key.pem'),
            cert: fs.readFileSync('./test/keys/unknown-client-cert.pem'),
            ca: [fs.readFileSync('./test/keys/unknown-server-cert.pem')],
            rejectUnauthorized: true
          }, function() {
            tlsConnection1.setEncoding('utf8');
            tlsConnection1.on('data', function(data) {
              console.log(data)
            });
            tlsConnection1.on('end', function() {
              netServer.close(function() {
                tlsServer2.close(function() {
                  tlsServer1.close(function() {
                    console.log('Finished');
                  });
                });
              });
            });
            tlsConnection1.write('Hello');
          });
        });
      });
      var tlsConnection2 = tls.connect({
        host: '127.0.0.1',
        port: TLS_PORT_2,
        key: fs.readFileSync('./test/keys/client-key.pem'),
        cert: fs.readFileSync('./test/keys/client-cert.pem'),
        ca: [fs.readFileSync('./test/keys/server-cert.pem')],
        rejectUnauthorized: true          
      }, function() {
        tlsConnection2.pipe(netConnection);
        netConnection.pipe(tlsConnection2);
      });
    });
  });
});
