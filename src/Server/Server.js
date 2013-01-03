var tls = require('tls'),
    Switchboard = require('./Switchboard'),
    Operator = require('./Operator'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Server(options) {
	var self = this,
      connections,
      forwardedPorts;

	var secureServer = tls.createServer({
		key: options.key,
		cert: options.cert,
		requestCert: true,
		rejectUnauthorized: true,
		ca: options.ca
	});

  var switchboard = new Switchboard(options);
  var operator = new Operator(secureServer, switchboard);
  operator.on('open', function(connectionString) {
    self.emit('open', parseInt(connectionString, 10));
  });
  operator.on('connect', function(connectionString) {
    self.emit('connect', parseInt(connectionString, 10));
  });

	self.start = function(callback) {
		secureServer.listen(options.port, callback);
	};

	self.stop = function(callback) {
    operator.cleanUp(function() {
      secureServer.close(callback);
    });
	};
}
util.inherits(Server, EventEmitter);

module.exports = Server;