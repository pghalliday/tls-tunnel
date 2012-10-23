var net = require('net');

// Conclusion: This does not work, it would only work if
// the host names resolved to different IPs/interfaces

var apple = net.createServer(function(connection) {
  console.log('apple');
});

var banana = net.createServer(function(connection) {
  console.log('banana');
});

apple.listen(8080, 'apple.localhost', function() {
  banana.listen(8080, 'banana.localhost', function() {
    var appleConnection = net.connect({
      port: 8080,
      host: 'apple.localhost'
    }, function() {
      var bananaConnection = net.connect({
        port: 8080,
        host: 'banana.localhost'
      }, function() {
        bananaConnection.on('end', function() {
          banana.close(function() {
            appleConnection.on('end', function() {
              apple.close(function() {
                console.log('finished');
              });
            });
            appleConnection.end();
          });
        });
        bananaConnection.end();
      });
    });
  });
});
