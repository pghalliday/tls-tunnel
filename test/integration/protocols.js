var expect = require('chai').expect,
    fs = require('fs'),
    Client = require('../../').Client,
    Server = require('../../').Server;

describe ('Protocol', function() {
  var port;
  var client = new Client({
    tunnel: {
      host: '127.0.0.1',
      port: 8080,
      key: fs.readFileSync('./test/keys/client-key.pem'),
      cert: fs.readFileSync('./test/keys/client-cert.pem'),
      ca: [fs.readFileSync('./test/keys/server-cert.pem')]
    },
    target: {
      host: 'localhost',
      port: 8000
    },
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
    }
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

  describe('Net', function() {
    var net = require('net');

    it('should be supported', function(done) {
      var netServer = net.createServer();
      netServer.on('connection', function(connection) {
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          expect(data).to.equal('Hello, server');
          connection.write('Hello, client');
        });
      });
      netServer.listen(8000, function() {
        var connection = net.connect({
          host: '127.0.0.1',
          port: port
        }, function() {
          connection.setEncoding('utf8');
          connection.on('end', function() {
            netServer.close(done);
          });
          connection.on('data', function(data) {
            expect(data).to.equal('Hello, client');
            connection.end();
          });
          connection.write('Hello, server');
        });
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
            httpServer.close(done);
          });
        });
      });
    });
  });

  describe('TLS', function() {
    var tls = require('tls');

    it('should be supported', function(done) {
      var tlsServer = tls.createServer({
        key: fs.readFileSync('./test/keys/unknown-server-key.pem'),
        cert: fs.readFileSync('./test/keys/unknown-server-cert.pem'),
        ca: [fs.readFileSync('./test/keys/unknown-client-cert.pem')],
        requireCert: true,
        rejectUnauthorized: true
      });
      tlsServer.on('secureConnection', function(connection) {
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          expect(data).to.equal('Hello, server');
          connection.write('Hello, client');
        });
      });
      tlsServer.listen(8000, function() {
        var connection = tls.connect({
          host: '127.0.0.1',
          port: port,
          key: fs.readFileSync('./test/keys/unknown-client-key.pem'),
          cert: fs.readFileSync('./test/keys/unknown-client-cert.pem'),
          ca: [fs.readFileSync('./test/keys/unknown-server-cert.pem')],
          rejectUnauthorized: true
        }, function() {
          connection.setEncoding('utf8');
          connection.on('end', function() {
            tlsServer.close(done);
          });
          connection.on('data', function(data) {
            expect(data).to.equal('Hello, client');
            connection.end();
          });
          connection.write('Hello, server');
        });
      });
    });
  });

  describe('HTTPS', function() {
    var https = require('https');

    it('should be supported', function(done) {
      var httpsServer = https.createServer({
        key: fs.readFileSync('./test/keys/unknown-server-key.pem'),
        cert: fs.readFileSync('./test/keys/unknown-server-cert.pem'),
      }, function(req, res) {
        res.end('Hello');
      });
      httpsServer.listen(8000, function() {
        https.get('https://127.0.0.1:' + port, function(res) {
          res.setEncoding('utf8');
          expect(res.statusCode).to.equal(200);
          res.on('data', function(data) {
            expect(data).to.equal('Hello');
          });
          res.on('end', function() {
            httpsServer.close(done);
          });
        });
      });
    });
  });

  describe('SSH', function() {
    var prompt = require('prompt');

    it('should be supported', function(done) {
      var timeout = 30;
      this.timeout(1000 * timeout);
      // TODO: instead of creating a new client to forward to
      // an existing SSH server it would be better if we started
      // an SSH server on port 8000. After all there may not be
      // an existing SSH server
      var client = new Client({
        tunnel: {
          host: '127.0.0.1',
          port: 8080,
          key: fs.readFileSync('./test/keys/client-key.pem'),
          cert: fs.readFileSync('./test/keys/client-cert.pem'),
          ca: [fs.readFileSync('./test/keys/server-cert.pem')]
        },
        target: {
          host: 'localhost',
          port: 22
        },
        timeout: 5000
      });
      client.connect(function(error, port) {
        if (error) {
          done(error);
        } else {
          // TODO: connect an SSH client to the assigned port
          prompt.start();
          var property = {
            name: 'yesno',
            message: 'You have ' + timeout + ' seconds to connect an SSH client to port ' + port + ' and confirm whether the test succeeded?',
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
          };
          prompt.get(property, function (err, result) {
            var pass = result.yesno.match(/y[es]*/);
            if (pass) {
              done();
            } else {
              done(new Error('Tester reported SSH failure'));
            }
          });
        }
      });
    });
  });

  after(function(done) {
    client.disconnect(function() {
      server.stop(done);
    });
  });
});

