var tls = require('tls'),
    crypto = require('crypto'),
    net = require('net'),
    Multiplex = require('../util/Multiplex');

function SingleTlsTunnel(tlsOptions) {
  var self = this,
      multiplex,
      clientConnected = false;
  
  var server = net.createServer(function(connection) {
    if (!clientConnected) {
      // This is the first connection so it should be a client trying to
      // negotiate a secure session
      var securePair = tls.createSecurePair(
        crypto.createCredentials({
          key: tlsOptions.key,
          cert: tlsOptions.cert,
          ca: tlsOptions.ca
        }),
        true,
        tlsOptions.requireCert,
        tlsOptions.rejectUnauthorized
      );
      var cleartext = securePair.cleartext,
          encrypted = securePair.encrypted;
      
      multiplex = new Multiplex();
      connection.pipe(encrypted).pipe(connection);
      cleartext.pipe(multiplex).pipe(cleartext);
      
      clientConnected = true;  
      connection.on('end', function() {
        clientConnected = false;
      });
    } else {
      var tunnel = multiplex.createStream();
      connection.pipe(tunnel).pipe(connection);
    }
  });
    
  self.listen = function(port, callback) {
    server.listen(port, callback);
  };
  
  self.close = function(callback) {
    server.close(callback);
  };
}

module.exports = SingleTlsTunnel;