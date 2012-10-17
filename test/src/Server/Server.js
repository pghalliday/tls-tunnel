var expect = require('chai').expect,
    Server = require('../../../src/Server/Server'),
    tls = require('tls'),
    fs = require('fs'),
    net = require('net'),
    Checklist = require('../../../src/util/test/Checklist');

var PORT = 8080,
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./test/keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./test/keys/unknown-client-cert.pem'),
    START_PORT = 8081,
    PORT_LIMIT = 3;

var SERVER_OPTIONS = {
  port: PORT,
  key: SERVER_KEY,
  cert: SERVER_CERT,
  ca: [CLIENT_CERT],
  forwardedPorts: {
    start: START_PORT,
    count: PORT_LIMIT
  },
  timeout: 5000
};

describe('Server', function() {
  var server;

  before(function() {
    server = new Server(SERVER_OPTIONS);
  });

  it('should end any open streams and stop when requested', function(done) {
    var checklist = new Checklist(['stopped', 'closed'], done);
    server.start(function() {
      var stoppedEventsReceived = 0;
      var connection = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT]
      }, function() {
        connection.on('close', function() {
          checklist.check('closed');
        });
        server.stop(function() {
          checklist.check('stopped');
        });
      });
    });    
  });

  describe('once started', function() {
    before(function(done) {
      server.start(done);
    });

    it('should accept TLS connections on the configured port, assign an external port for forwarding and emit an event', function(done) {
      var checklist = new Checklist(['open', 'open:success:' + START_PORT, 'end'], done);
      server.once('open', function(forwardedPort) {
        expect(forwardedPort).to.equal(START_PORT);
        checklist.check('open');
      });
      var connection = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        connection.write('open');
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          checklist.check(data);
          connection.end();
        });
        connection.on('end', function() {
          checklist.check('end');
        });
      });
    });

    it('should accept multiple connections but immediately end connections if no more ports are available for forwarding', function(done) {
      var errorCount = 0;
      var connection1 = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        connection1.write('open');
        connection1.setEncoding('utf8');
        connection1.on('data', function(data) {
          expect(data).to.equal('open:success:' + START_PORT, 'connection1');
          var connection2 = tls.connect({
            port: PORT,
            key: CLIENT_KEY,
            cert: CLIENT_CERT
          }, function() {
            connection2.write('open');
            connection2.setEncoding('utf8');
            connection2.on('data', function(data) {
              expect(data).to.equal('open:success:' + (START_PORT + 1), 'connection2');
              var connection3 = tls.connect({
                port: PORT,
                key: CLIENT_KEY,
                cert: CLIENT_CERT
              }, function() {
                connection3.write('open');
                connection3.setEncoding('utf8');
                connection3.on('data', function(data) {
                  expect(data).to.equal('open:success:' + (START_PORT + 2), 'connection3');
                  var connection4 = tls.connect({
                    port: PORT,
                    key: CLIENT_KEY,
                    cert: CLIENT_CERT
                  }, function() {
                    connection4.write('open');
                    connection4.setEncoding('utf8');
                    connection4.on('data', function(data) {
                      errorCount++;
                      expect(data).to.equal('open:error:No more ports available');
                    });
                    connection4.on('end', function() {
                      connection3.end();
                    });
                  });
                  connection3.on('end', function() {
                    connection2.end();
                  });
                });
                connection2.on('end', function() {
                  connection1.end();
                });
              });
              connection1.on('end', function() {
                expect(errorCount).to.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    it('should reject connections with unknown certificates', function(done) {
      var secureConnectEventCount = 0;
      var connection = tls.connect({
        port: PORT,
        key: UNKNOWN_CLIENT_KEY,
        cert: UNKNOWN_CLIENT_CERT
      }, function() {
        secureConnectEventCount++;
      });
      connection.on('error', function(error) {
        expect(secureConnectEventCount).to.equal(0);
        done();
      });
    });

    it('should reject connections without a certificate', function(done) {
      var secureConnectEventCount = 0;
      var connection = tls.connect({
        port: PORT
      }, function() {
        secureConnectEventCount++;
      });
      connection.on('error', function(error) {
        expect(secureConnectEventCount).to.equal(0);
        done();
      });
    });

    describe('and connected', function() {
      var connection;
      var forwardedPort;
      
      before(function(done) {
        connection = tls.connect({
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT
        }, function() {
          connection.write('open');
          connection.setEncoding('utf8');
          connection.once('data', function(data) {
            forwardedPort = parseInt(data.substring('open:success:'.length), 10);
            done();
          });
        });
      });
      
      it('should accept unencrypted connections to the forwarded port, emit a connect event and send data to the target', function(done) {
        var checklist = new Checklist([forwardedPort,'This is a testThis is also a test'], done);
        server.once('connect', function(port) {
          checklist.check(port);
        });
        var dataConnection;
        var client = net.connect({
          port: forwardedPort
        }, function() {
          connection.on('data', function(data) {
            var dataConnection = tls.connect({
              port: PORT,
              key: CLIENT_KEY,
              cert: CLIENT_CERT
            }, function() {
              var allData = '';
              dataConnection.setEncoding('utf8');
              dataConnection.on('data', function(data) {
                allData += data;
              });
              dataConnection.on('end', function() {
                checklist.check('This is a testThis is also a test');
              });
              dataConnection.write(data);
            });
          });
          client.write('This is a test');
          client.end('This is also a test');
        });
      });
      
      after(function(done) {
        connection.on('end', done);
        connection.end();
      });
    });

    after(function(done) {
      server.stop(done);
    });
  });
});