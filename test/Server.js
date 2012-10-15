var expect = require('chai').expect,
    Server = require('../src/Server'),
    tls = require('tls'),
    fs = require('fs'),
    net = require('net'),
    CheckList = require('../src/util/test/CheckList');

var PORT = 8080,
    SERVER_KEY = fs.readFileSync('./keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./keys/client-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./keys/unknown-client-cert.pem'),
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
  }
};

describe('Server', function() {
  var server;

  before(function() {
    server = new Server(SERVER_OPTIONS);
  });

  it('should end any open streams and stop when requested', function(done) {
    var checkList = new CheckList(['stopped', 'closed'], function(error) {
      expect(error).to.be.an('undefined');
      done();
    });
    server.start(function() {
      var stoppedEventsReceived = 0;
      var connection = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT]
      }, function() {
        connection.on('close', function() {
          checkList.check('closed');
        });
        server.stop(function() {
          checkList.check('stopped');
        });
      });
    });    
  });

  describe('once started', function() {
    before(function(done) {
      server.start(done);
    });

    it('should accept TLS connections on the configured port and assign an external port for forwarding', function(done) {
      var dataEventCount = 0;
      var connection = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        connection.write('open');
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          dataEventCount++;
          expect(data).to.equal('opened: ' + START_PORT);
          connection.end();
        });
        connection.on('end', function() {
          expect(dataEventCount).to.equal(1);
          done();
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
          expect(data).to.equal('opened: ' + START_PORT, 'connection1');
          var connection2 = tls.connect({
            port: PORT,
            key: CLIENT_KEY,
            cert: CLIENT_CERT
          }, function() {
            connection2.write('open');
            connection2.setEncoding('utf8');
            connection2.on('data', function(data) {
              expect(data).to.equal('opened: ' + (START_PORT + 1), 'connection2');
              var connection3 = tls.connect({
                port: PORT,
                key: CLIENT_KEY,
                cert: CLIENT_CERT
              }, function() {
                connection3.write('open');
                connection3.setEncoding('utf8');
                connection3.on('data', function(data) {
                  expect(data).to.equal('opened: ' + (START_PORT + 2), 'connection3');
                  var connection4 = tls.connect({
                    port: PORT,
                    key: CLIENT_KEY,
                    cert: CLIENT_CERT
                  }, function() {
                    connection4.write('open');
                    connection4.setEncoding('utf8');
                    connection4.on('data', function(data) {
                      errorCount++;
                      expect(data).to.equal('error: no ports available for forwarding');
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

    it.skip('should reuse forwarded ports when they become available again', function(done) {
      // TODO: this is different on windows!!

      // NB. after the last test the ports available will have been reversed I think
      // because the end events are emitted before the streams are actually stopped
      // with the server which actually then happens after the events have been handled.
      // If this seems confusing it's probaby because it is.
      
      var errorCount = 0;
      var connection1 = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        connection1.write('open');
        connection1.setEncoding('utf8');
        connection1.on('data', function(data) {
          expect(data).to.equal('opened: ' + (START_PORT + 2), 'connection1');
          var connection2 = tls.connect({
            port: PORT,
            key: CLIENT_KEY,
            cert: CLIENT_CERT
          }, function() {
            connection2.write('open');
            connection2.setEncoding('utf8');
            connection2.on('data', function(data) {
              expect(data).to.equal('opened: ' + (START_PORT + 1), 'connection2');
              var connection3 = tls.connect({
                port: PORT,
                key: CLIENT_KEY,
                cert: CLIENT_CERT
              }, function() {
                connection3.write('open');
                connection3.setEncoding('utf8');
                connection3.on('data', function(data) {
                  expect(data).to.equal('opened: ' + START_PORT, 'connection3');
                  var connection4 = tls.connect({
                    port: PORT,
                    key: CLIENT_KEY,
                    cert: CLIENT_CERT
                  }, function() {
                    connection4.write('open');
                    connection4.setEncoding('utf8');
                    connection4.on('data', function(data) {
                      errorCount++;
                      expect(data).to.equal('error: no ports available for forwarding', 'connection4');
                    });
                    connection4.on('end', function() {
                      connection2.end();
                    });
                  });
                  connection3.on('end', function() {
                    connection2.end();
                  });
                });
                connection2.on('end', function() {
                  var connection5 = tls.connect({
                    port: PORT,
                    key: CLIENT_KEY,
                    cert: CLIENT_CERT
                  }, function() {
                    connection5.write('open');
                    connection5.setEncoding('utf8');
                    connection5.on('data', function(data) {
                      // NB. If this test ever fails then it maybe because of a race condition.
                      // as far as I can tell the end event is emmitted before the server has been
                      // notified - however it is likely that the server will get the end for connection2
                      // before it gets the connect for connection5 so maybe it's all good
                      expect(data).to.equal('opened: ' + (START_PORT + 1), 'connection5');
                      var connection6 = tls.connect({
                        port: PORT,
                        key: CLIENT_KEY,
                        cert: CLIENT_CERT
                      }, function() {
                        connection6.write('open');
                        connection6.setEncoding('utf8');
                        connection6.on('data', function(data) {
                          errorCount++;
                          expect(data).to.equal('error: no ports available for forwarding', 'connection6');
                        });
                        connection6.on('end', function() {
                          connection5.end();
                        });
                      });
                      connection5.on('end', function() {
                        connection1.end();
                      });
                    });
                  });
                  connection1.on('end', function() {
                    expect(errorCount).to.equal(2);
                    done();
                  });
                });
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
          connection.on('data', function(data) {
            forwardedPort = parseInt(data.substring('opened: '.length), 10);
            done();
          });
        });
      });
      
      it.skip('should accept unencrypted connections to the forwarded port', function(done) {
        var client = net.connect({
          port: forwardedPort
        }, function() {
          console.log(arguments);
          client.on('end', done);
          client.end();
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