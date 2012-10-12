var tls = require('tls');
var fs = require('fs');

function Server(port, key, cert) {
	var self = this;
  var cleartextStreams = [];

	var server = tls.createServer({
		key: key,
		cert: cert,
		requestCert: true
	}, function(cleartextStream) {
    cleartextStreams.push(cleartextStream);
    cleartextStream.on('end', function() {
      cleartextStreams.splice(cleartextStreams.indexOf(cleartextStream), 1);
    });
	});

	this.start = function(callback) {
		server.listen(port, callback);
	};

	this.stop = function(callback) {
    cleartextStreams.forEach(function(cleartextStream) {
      cleartextStream.destroy();
    });
    cleartextStreams = [];
		server.close(callback);
	};
}

module.exports = Server;