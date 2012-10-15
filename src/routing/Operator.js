var uuid = require('node-uuid');

function Operator(secureServer, switchboard, timeout) {
  var self = this,
      secureConnections = [],
      pausedConnections = {};

  secureServer.on('secureConnection', function(secureConnection) {
    secureConnections.push(secureConnection);
    secureConnection.on('end', function() {
      secureConnections.splice(secureConnections.indexOf(secureConnection), 1);
    });
    secureConnection.once('data', function(data) {
      if (data === 'open') {
        switchboard.startServer(function(error, server) {
          if (error) {
            secureConnection.end('open:error:' + error.message);
          } else {
            secureConnection.on('end', function() {
              switchboard.stopServer(server, function() {
                // TODO: Is this a smell? Feels like i'm losing control
                // because I can't think of anything I might want to use
                // this callback for here (it's useful elsewhere, ie. tests)
              });
            });
            secureConnection.write('open:success:' + server.getConnectionString());
            server.on('connection', function(connection) {
              connection.pause();
              var id = uuid.v1();
              pausedConnections[id] = {
                connection: connection,
                timeout: timeout ? setTimeout(function() {
                  delete pausedConnections[id];
                  connection.end();
                }, timeout) : timeout
              };
              secureConnection.write('connect:' + id);
            });
          }
        });
      }
      else {
        var id = data.match(/^connect:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
        if (id) {
          var pausedConnection = pausedConnections[id[1]];
          if (pausedConnection) {
            delete pausedConnections[id[1]];
            clearTimeout(pausedConnection.timeout);
            pausedConnection.connection.pipe(secureConnection);
            secureConnection.pipe(pausedConnection.connection);
            pausedConnection.connection.resume();
          } else {
            secureConnection.end();
          }
        } else {
          secureConnection.end();
        }
      }
    });
  });
  
  self.cleanup = function(callback) {
    secureConnections.forEach(function(secureConnection) {
      secureConnection.end();
    });
    switchboard.stopAll(callback);
  };
}

module.exports = Operator;