var tls = require('tls'),
    Range = require('./util/Range'),
    Switchboard = require('./routing/Switchboard'),
    Operator = require('./routing/Operator'),
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

  var switchboard = new Switchboard(new Range(options.forwardedPorts.start, options.forwardedPorts.count));
  var operator = new Operator(secureServer, switchboard, options.timeout);
  operator.on('open', function(connectionString) {
    self.emit('open', parseInt(connectionString, 10));
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