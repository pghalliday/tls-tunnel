var expect = require('chai').expect;
var TlsServer = require('../src/TlsServer.js');
var tls = require('tls');
var fs = require('fs');

var PORT = 8080;
var SERVER_KEY = fs.readFileSync(__dirname + '/keys/server-key.pem');
var SERVER_CERT = fs.readFileSync(__dirname + '/keys/server-cert.pem');
var CLIENT_KEY = fs.readFileSync(__dirname + '/keys/client-key.pem');
var CLIENT_CERT = fs.readFileSync(__dirname + '/keys/client-cert.pem');
var UNKNOWN_CLIENT_KEY = fs.readFileSync(__dirname + '/keys/unknown-client-key.pem');
var UNKNOWN_CLIENT_CERT = fs.readFileSync(__dirname + '/keys/unknown-client-cert.pem');

describe('TlsServer', function() {
  var server;

  it('should end any open streams and stop when requested', function(done) {
    server = new TlsServer(PORT, SERVER_KEY, SERVER_CERT, [CLIENT_CERT]);
    server.start(function() {
      var stoppedEventsReceived = 0;
      var cleartextStream = tls.connect({
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT]
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
      server = new TlsServer(PORT, SERVER_KEY, SERVER_CERT, [CLIENT_CERT]);
      server.start(done);
    });

    it('should authorize TLS connections on the configured port', function(done) {
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

    it('should reject connections with unknown certificates', function(done) {
      var secureConnectEventCount = 0;
      var cleartextStream = tls.connect({
        port: PORT,
        key: UNKNOWN_CLIENT_KEY,
        cert: UNKNOWN_CLIENT_CERT
      }, function() {
        secureConnectEventCount++;
      });
      cleartextStream.on('error', function(error) {
        expect(secureConnectEventCount).to.equal(0);
        done();
      });
    });

    it('should reject connections without a certificate', function(done) {
      var secureConnectEventCount = 0;
      var cleartextStream = tls.connect({
        port: PORT
      }, function() {
        secureConnectEventCount++;
      });
      cleartextStream.on('error', function(error) {
        expect(secureConnectEventCount).to.equal(0);
        done();
      });
    });

    after(function(done) {
      server.stop(done);
    });
  });
});