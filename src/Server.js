var tls = require('tls'),
    fs = require('fs'),
    Range = require('./util/Range');

function Server(options) {
	var self = this,
      connections,
      forwardedPorts;

	var server = tls.createServer({
		key: options.key,
		cert: options.cert,
		requestCert: true,
		rejectUnauthorized: true,
		ca: options.ca
	}, function(connection) {
    connections.push(connection);
    connection.on('end', function() {
      connections.splice(connections.indexOf(connection), 1);
    });
    connection.setEncoding('utf8');
    connection.once('data', function(data) {
      if (data === 'open') {
        forwardedPorts.pop(function(error, forwardedPort) {
          if (error) {
            connection.write('error: no ports available for forwarding');
            connection.end();
          } else {
            connection.write('opened: ' + forwardedPort);
            connection.on('end', function() {
              forwardedPorts.push(forwardedPort);
            });
          }
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
      connection.end();
    });
		server.close(callback);
	};
}

module.exports = Server;