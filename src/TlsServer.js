var tls = require('tls'),
    fs = require('fs'),
    Range = require('./util/Range');

function TlsServer(options) {
	var self = this;
  var connections;
  var forwardedPorts;

	var server = tls.createServer({
		key: options.key,
		cert: options.cert,
		requestCert: true,
		rejectUnauthorized: true,
		ca: options.ca
	}, function(connection) {
    forwardedPorts.pop(function(error, forwardedPort) {
      if (error) {
        connection.write('error: no ports available for forwarding');
        connection.end();
      } else {
        connections.push(connection);
        connection.write('' + forwardedPort);
        connection.on('end', function() {
          connections.splice(connections.indexOf(connection), 1);
          forwardedPorts.push(forwardedPort);
        });    
      }
    });
	});

	self.start = function(callback) {
    connections = [];
    forwardedPorts = new Range(options.forwardedPorts.start, options.forwardedPorts.count);
		server.listen(options.port, callback);
	};

	self.stop = function(callback) {
    connections.forEach(function(connection) {
      connection.destroy();
    });
		server.close(callback);
	};
}

module.exports = TlsServer;