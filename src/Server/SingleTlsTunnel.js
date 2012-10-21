var tls = require('tls');

function SingleTlsTunnel(options) {
  var server = tls.createServer(options);
  var self = this;
  
  self.listen = function(port, callback) {
    server.listen(port, callback);
  };
  
  self.close = function(callback) {
    server.close(callback);
  };
}

module.exports = SingleTlsTunnel;