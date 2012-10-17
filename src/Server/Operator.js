var uuid = require('node-uuid'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Operator(secureServer, switchboard, timeout) {
  var self = this,
      secureConnections = [],
      pausedConnections = {};

  secureServer.on('secureConnection', function(secureConnection) {
    secureConnections.push(secureConnection);
    secureConnection.on('end', function() {
      secureConnections.splice(secureConnections.indexOf(secureConnection), 1);
    });
    secureConnection.setEncoding('utf8');
    secureConnection.once('data', function(data) {
      if (data === 'open') {
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
            server.on('connection', function(connection) {
              connection.pause();
              var id = uuid.v1();
              pausedConnections[id] = {
                connection: connection,
                connectionString: server.getConnectionString(),
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
            self.emit('connect', pausedConnection.connectionString);
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