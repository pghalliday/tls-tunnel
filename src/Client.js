var tls = require('tls'),
    net = require('net');

function Client(options) {
  var self = this;
  var controlConnection;
  var secureConnections = [];
  var connections = [];

  self.connect = function(callback) {
    controlConnection = tls.connect({
      host: options.host,
      port: options.port,
      key: options.key,
      cert: options.cert,
      ca: options.ca,
      rejectUnauthorized: true
    }, function() {
      controlConnection.write('open');
      if (options.timeout) {
        var timeout = setTimeout(function() {
          controlConnection.on('end', function() {
            callback(new Error('Open request timed out'));
          });
          controlConnection.end();
        }, options.timeout);
      }
      controlConnection.setEncoding('utf8');
      controlConnection.on('data', function(data) {
        var matched = data.match(/^open:success:(.*)$/);
        if (matched) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          callback(null, matched[1]);
        } else {
          matched = data.match(/connect:.*/);
          if (matched) {
            var connection = net.connect({
              port: options.targetPort
            }, function() {
              var secureConnection = tls.connect({
                host: options.host,
                port: options.port,
                key: options.key,
                cert: options.cert,
                ca: options.ca,
                rejectUnauthorized: true
              }, function() {
                secureConnections.push(secureConnection);
                secureConnection.on('end', function() {
                  secureConnections.splice(secureConnections.indexOf(secureConnection), 1);
                  connection.end();
                });
                secureConnection.write(data);

                // TODO: are we sure that this piping will not send
                // the connect data from the line above to the target server
                secureConnection.pipe(connection);
                connection.pipe(secureConnection);
              });
              // TODO: handle errors while making the secure connection to ensure
              // that the local connection is ended too
            });
          } else {
            // TODO: should we emit an error event and end the
            // secureConnection here - after all we expect the server
            // to play nice
          }
        }
      });
    });
    controlConnection.on('error', function(error) {
      callback(typeof error === 'string' ? new Error(error) : error);
    });
  };

  self.disconnect = function(callback) {
    secureConnections.forEach(function(secureConnection) {
      secureConnection.end();
    });
    controlConnection.on('end', function() {
      callback();
    });
    controlConnection.end();
  };
}

module.exports = Client;