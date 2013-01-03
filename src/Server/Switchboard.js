var Server = require('single-tls-tunnel').Server,
    Range = require('./Range');

function Switchboard(options) {
  var self = this,
      serversAndConnections = [],
      portRange = new Range(options.forwardedPorts.start, options.forwardedPorts.count);

  self.startServer = function(callback) {
    portRange.pop(function(error, port) {
      if (error) {
        callback(new Error('No more ports available'));
      } else {
        var server = new Server({
          key: options.key,
          cert: options.cert,
          ca: options.ca, 
          requireCert: true,
          rejectUnauthorized: true  
        });
        server.getConnectionString = function() {
          return '' + port;
        };
        var connections = [];
        var serverAndConnections = {
          server: server,
          connections: connections,
          port: port
        };
        server.listen(port, function() {
          serversAndConnections.push(serverAndConnections);
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
        var connections = serverAndConnections.connections.slice(0);
        connections.forEach(function(connection) {
          connection.end();
        });
        serversAndConnections.splice(serversAndConnections.indexOf(serverAndConnections), 1);
        serverAndConnections.server.close(function() {
          portRange.push(serverAndConnections.port);
          if (callback) {
            callback();
          }
        });
      }
    });
  };
}

module.exports = Switchboard;