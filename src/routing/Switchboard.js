var net = require('net');

function Switchboard(portRange) {
  var self = this,
      serversAndConnections = [];

  self.startServer = function(callback) {
    portRange.pop(function(error, port) {
      if (error) {
        callback(new Error('No more ports available'));
      } else {
        var server = net.createServer();
        server.getConnectionString = function() {
          return '' + port;
        };
        var connections = [];
        var serverAndConnections = {
          server: server,
          connections: connections
        };
        serversAndConnections.push(serverAndConnections);
        server.on('close', function() {
          serversAndConnections.splice(serversAndConnections.indexOf(serverAndConnections), 1);
        });
        server.listen(port, function() {
          server.on('connection', function(connection) {
            connections.push(connection);
            connection.on('end', function() {
              connections.splice(connections.indexOf(connection), 1);
            });
          });
          callback(null, server);
        });
      }
    });
  };

  self.stopServer = function(server, callback) {
    serversAndConnections.forEach(function(serverAndConnections) {
      if (serverAndConnections.server === server) {
        serverAndConnections.connections.forEach(function(connection) {
          connection.end();
        });
        serverAndConnections.server.close(function() {
          callback();
        });
      }
    });
  };

  self.stopAll = function(callback) {
    var serverCount = serversAndConnections.length;
    if (serverCount === 0) {
      callback();
    }
    serversAndConnections.forEach(function(serverAndConnections) {
      serverAndConnections.connections.forEach(function(connection) {
        connection.end();
      });
      serverAndConnections.server.close(function() {
        serverCount--;
        if (serverCount === 0) {
          callback();
        }
      });
    });
  };
}

module.exports = Switchboard;