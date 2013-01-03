var tls = require('tls'),
    net = require('net'),
    SingleTlsTunnelClient = require('single-tls-tunnel').Client;

var DEFAULT_TIMEOUT = 2000;

function Client(options) {
  var self = this;
  var controlConnection;
  var singleTlsTunnelClient;

  self.connect = function(callback) {
    controlConnection = tls.connect({
      host: options.tunnel.host,
      port: options.tunnel.port,
      key: options.tunnel.key,
      cert: options.tunnel.cert,
      ca: options.tunnel.ca,
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
            // use single-tls-tunnel client to connect to port given
            // in success[1]
            var port = parseInt(success[1], 10);
            singleTlsTunnelClient = new SingleTlsTunnelClient({
              host: options.tunnel.host,
              port: port,
              key: options.tunnel.key,
              cert: options.tunnel.cert,
              ca: options.tunnel.ca,
              rejectUnauthorized: true
            }, {
              host: options.target.host,
              port: options.target.port
            });
            singleTlsTunnelClient.on('error', function(error) {
              callback(error);
            });
            singleTlsTunnelClient.connect(function() {
              callback(null, port);
            });
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
          // TODO: should we emit an error event and end the
          // secureConnection here - after all we expect the server
          // to play nice
        }
      });
    });
    controlConnection.on('error', function(error) {
      callback(typeof error === 'string' ? new Error(error) : error);
    });
  };

  self.disconnect = function(callback) {
    singleTlsTunnelClient.on('end', function() {
      controlConnection.on('end', function() {
        callback();
      });
      controlConnection.end();
    });
    singleTlsTunnelClient.end();
  };
}

module.exports = Client;