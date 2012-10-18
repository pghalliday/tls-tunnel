var expect = require('chai').expect,
    fs = require('fs'),
    Client = require('../../').Client,
    Server = require('../../').Server;

describe ('Protocol', function() {
  var port;
  var client = new Client({
    host: '127.0.0.1',
    port: 8080,
    key: fs.readFileSync('./test/keys/client-key.pem'),
    cert: fs.readFileSync('./test/keys/client-cert.pem'),
    ca: [fs.readFileSync('./test/keys/server-cert.pem')],
    targetPort: 8000,
    timeout: 5000
  });

  var server = new Server({
    port: 8080,
    key: fs.readFileSync('./test/keys/server-key.pem'),
    cert: fs.readFileSync('./test/keys/server-cert.pem'),
    ca: [fs.readFileSync('./test/keys/client-cert.pem')],
    forwardedPorts: {
      start: 8081,
      count: 10
    },
    timeout: 5000
  });

  before(function(done) {
    server.start(function() {
      client.connect(function(error, assignedPort) {
        if (error) {
          done(error);
        } else {
          port = assignedPort;
          done();
        }
      });
    });
  });

  describe('HTTP', function() {
    var http = require('http');
    
    it('should be supported', function(done) {
      var httpServer = http.createServer(function(req, res) {
        res.end('Hello');
      });
      httpServer.listen(8000, function() {
        http.get('http://127.0.0.1:' + port, function(res) {
          res.setEncoding('utf8');
          expect(res.statusCode).to.equal(200);
          res.on('data', function(data) {
            expect(data).to.equal('Hello');
          });
          res.on('end', function() {
            httpServer.close(function() {
              done();
            });
          });
        });
      });
    });

    after(function(done) {
      client.disconnect(function() {
        server.stop(done);
      });
    });
  });
});

