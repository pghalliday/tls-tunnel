var uuid = require('node-uuid'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Operator(secureServer, switchboard) {
  var self = this,
      secureConnections = [];

  secureServer.on('secureConnection', function(secureConnection) {
    secureConnections.push(secureConnection);
    secureConnection.on('end', function() {
      secureConnections.splice(secureConnections.indexOf(secureConnection), 1);
    });
    secureConnection.setEncoding('utf8');
    secureConnection.once('data', function(data) {
      if (data === 'open') {
        // TODO: pass in the peer certificate so that only the same client can connect
        // to the started server instance
        switchboard.startServer(function(error, server) {
          if (error) {
            secureConnection.end('open:error:' + error.message);
          } else {
            secureConnection.on('end', function() {
              // TODO: really, nothing to do when the server is stopped?
              switchboard.stopServer(server);
            });
            secureConnection.write('open:success:' + server.getConnectionString());
            self.emit('open', server.getConnectionString());
          }
        });
      }
      else {
        secureConnection.end();
      }
    });
  });
  
  self.cleanUp = function(callback) {
    var count = secureConnections.length;
    if (count === 0) {
      callback();
    }
    var connections = secureConnections.slice(0);
    connections.forEach(function(secureConnection) {
      secureConnection.end();
      count--;
      if (count === 0) {
        callback();
      }
    });
  };
}
util.inherits(Operator, EventEmitter);

module.exports = Operator;