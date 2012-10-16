var tls = require('tls');

function Client(options) {
  var self = this;
  var connection;

  self.connect = function(callback) {
    connection = tls.connect({
      host: options.host,
      port: options.port,
      key: options.key,
      cert: options.cert,
      ca: options.ca,
      rejectUnauthorized: true
    }, function() {
      connection.write('open');
      connection.setEncoding('utf8');
      connection.on('data', function(data) {
        callback(null, parseInt(data.substring('open:success:'.length), 10));
      });
    });
  };

  self.disconnect = function(callback) {
    connection.on('end', function() {
      callback();
    });
    connection.end();
  };
}

module.exports = Client;