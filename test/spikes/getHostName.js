var net = require('net');
console.log(net);
var server = net.createServer();
server.on('connection', function(connection) {
  console.log(connection);
});
server.listen(8080, function() {
  var connection1 = net.connect({
    host: 'localhost',
    port: 8080
  }, function() {
    var connection2 = net.connect({
      host: '127.0.0.1',
      port: 8080
    });
  });
});