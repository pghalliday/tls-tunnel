var tls = require('tls'),
    net = require('net');

var DEFAULT_TIMEOUT = 2000;

function Client(options) {
  var self = this;
  var controlConnection;
  var secureConnections = [];

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
      var timeout = setTimeout(function() {
        controlConnection.on('end', function() {
          callback(new Error('Open request timed out'));
        });
        controlConnection.end();
      }, options.timeout ? options.timeout : DEFAULT_TIMEOUT);
      controlConnection.setEncoding('utf8');
      controlConnection.on('data', function(data) {
        var opened = data.match(/^open:(.*)$/);
        if (opened) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          var success = opened[1].match(/^success:(.*)$/);
          if (success) {
            callback(null, success[1]);
          } else {
            var error = opened[1].match(/^error:(.*)$/);
            if (error) {
              callback(new Error('Server rejected connection: ' + error[1]));
            } else {
              // TODO: should we emit an error event and end the
              // secureConnection here - after all we expect the server
              // to play nice
            }
          }
        } else {
          var connected = data.match(/connect:(.*)/);
          if (connected) {
            // TODO: enforce a connection limit?
            var connection = net.connect({
              port: options.targetPort
            }, function() {
              // TODO: handle inactive timeouts and other errors?
              var secureConnection = tls.connect({
                host: options.host,
                port: options.port,
                key: options.key,
                cert: options.cert,
                ca: options.ca,
                rejectUnauthorized: true
              }, function() {
                // TODO: handle inactive timeouts and other errors?
                secureConnections.push(secureConnection);
                secureConnection.on('end', function() {
                  secureConnections.splice(secureConnections.indexOf(secureConnection), 1);
                  connection.end();
                });
                secureConnection.write(data);
                secureConnection.pipe(connection);
                connection.pipe(secureConnection);
              });
              secureConnection.on('error', function(error) {
                connection.end();
                // TODO: remove this error listener on successful connection?
              });
            });
            connection.on('error', function() {
              // TODO: errors should be reported back to
              // the server? Or just let the connection 
              // request timeout?

              // TODO: remove this error listener on successful connection?
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