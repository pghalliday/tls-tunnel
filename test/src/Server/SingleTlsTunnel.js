var expect = require('chai').expect,
    tls = require('tls'),
    fs = require('fs'),
    SingleTlsTunnel = require('../../../src/Server/SingleTlsTunnel');
    
var PORT = 8080;

var PORT = 8080,
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./test/keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./test/keys/unknown-client-cert.pem');

describe('SingleTlsTunnel', function() {
  it('should initially listen on the given port for TLS connections', function(done) {
    var server = new SingleTlsTunnel({
      key: SERVER_KEY,
      cert: SERVER_CERT,
      ca: [CLIENT_CERT], 
      requireCert: true,
      rejectUnauthorized: true
    });
    server.listen(PORT, function() {
      var connection = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        rejectUnauthorized: true
      }, function() {
        connection.on('end', function() {
          server.close(function() {
            done();
          });
        });
        connection.end();
      });
    });
  });
});