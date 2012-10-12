var tls = require('tls');
var fs = require('fs');

function TlsServer(port, key, cert, ca) {
	var self = this;
  var cleartextStreams = [];

	var server = tls.createServer({
		key: key,
		cert: cert,
		requestCert: true,
		rejectUnauthorized: true,
		ca: ca
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

module.exports = TlsServer;