var expect = require('chai').expect;
var Server = require('../src/Server.js');
var tls = require('tls');
var fs = require('fs');

var PORT = 8080;
var SERVER_KEY = fs.readFileSync(__dirname + '/keys/server-key.pem');
var SERVER_CERT = fs.readFileSync(__dirname + '/keys/server-cert.pem');
var CLIENT_KEY = fs.readFileSync(__dirname + '/keys/client-key.pem');
var CLIENT_CERT = fs.readFileSync(__dirname + '/keys/client-cert.pem');

describe('Server', function() {
  var server;

  it('should end any open streams and stop when requested', function(done) {
    server = new Server(PORT, SERVER_KEY, SERVER_CERT);
    server.start(function() {
      var stoppedEventsReceived = 0;
      var cleartextStream = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        server.stop(function() {
          // TODO: I would rather the streams received end events first
          stoppedEventsReceived++;
        });
      });
      cleartextStream.on('end', function() {
        expect(stoppedEventsReceived).to.equal(1);
        done();
      });
    });    
  });

  describe('once started', function() {
    before(function(done) {
      server = new Server(PORT, SERVER_KEY, SERVER_CERT);
      server.start(done);
    });

    it('should accept TLS connections on the configured port', function(done) {
      var secureConnectEventCount = 0;
      var cleartextStream = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT
      }, function() {
        secureConnectEventCount++;
        cleartextStream.end();
      });
      cleartextStream.on('end', function() {
        expect(secureConnectEventCount).to.equal(1);
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });
  });
});