var net = require('net');

function Switchboard(port, operator) {
  var self = this,
      clients;
  
  var server = net.createServer(function(client) {
    clients.push(client);
    client.on('end', function() {
      clients.splice(clients.indexOf(client), 1);
    });
    
    // pause the client and start piping it to the target before resuming it
    client.pause();
    operator.connect(client, function() {
      client.resume();
    });
  });
  
  self.start = function(callback) {
    clients = [];
    server.listen(port, callback);
  };
  
  self.stop = function(callback) {
    clients.forEach(function(client) {
      client.end();
    });
    server.close(callback);
  };
}

module.exports = Switchboard;