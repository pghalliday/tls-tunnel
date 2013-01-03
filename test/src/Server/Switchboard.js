var expect = require('chai').expect,
    Switchboard = require('../../../src/Server/Switchboard'),
    Range = require('../../../src/Server/Range'),
    Checklist = require('checklist'),
    Client = require('single-tls-tunnel').Client,
    fs = require('fs');

var SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    START_PORT = 8081,
    PORT_LIMIT = 3;

var OPTIONS = {
  key: SERVER_KEY,
  cert: SERVER_CERT,
  ca: [CLIENT_CERT],
  forwardedPorts: {
    start: START_PORT,
    count: PORT_LIMIT
  }
};

describe('Switchboard', function() {
  it('should start single-tls-tunnel servers listening on ports in the given range until no more ports remain', function(done) {
    var switchboard = new Switchboard(OPTIONS);
    var servers = [];

    var checklist = new Checklist([
      (new Error('No more ports available')).toString(),
      'connected:8081',
      'connected:8082',
      'connected:8083',
      'connect:8081',
      'connect:8082',
      'connect:8083'
    ], function(error) {
      expect(error).to.be.an('undefined');
      var count = servers.length;
      servers.forEach(function(server) {
        switchboard.stopServer(server, function() {
          count--;
          if (count === 0) {
            done();
          }
        });
      });
    });

    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      expect(server.getConnectionString()).to.equal('8081');
      servers.push(server);
      var client = new Client({
        host: 'localhost',
        port: 8081,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        rejectUnauthorized: true
      }, {
        host: 'localhost',
        port: 8000
      });
      server.on('connected', function() {
        checklist.check('connected:8081');
      });
      client.connect(function() {
        checklist.check('connect:8081');
      });
    });

    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      expect(server.getConnectionString()).to.equal('8082');
      servers.push(server);
      var client = new Client({
        host: 'localhost',
        port: 8082,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        rejectUnauthorized: true
      }, {
        host: 'localhost',
        port: 8000
      });
      server.on('connected', function() {
        checklist.check('connected:8082');
      });
      client.connect(function() {
        checklist.check('connect:8082');
      });
    });

    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      expect(server.getConnectionString()).to.equal('8083');
      servers.push(server);
      var client = new Client({
        host: 'localhost',
        port: 8083,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        rejectUnauthorized: true
      }, {
        host: 'localhost',
        port: 8000
      });
      server.on('connected', function() {
        checklist.check('connected:8083');
      });
      client.connect(function() {
        checklist.check('connect:8083');
      });
    });

    switchboard.startServer(function(error, server) {
      checklist.check(error.toString());
    });
  });

  it('should reuse ports after servers are stopped', function(done) {
    var switchboard = new Switchboard(OPTIONS);
    switchboard.startServer(function(error, server1) {
      expect(error).to.equal(null);
      expect(server1.getConnectionString()).to.equal('8081');
      switchboard.stopServer(server1, function() {
        switchboard.startServer(function(error, server2) {
          expect(error).to.equal(null);
          expect(server2.getConnectionString()).to.equal('8081');
          switchboard.stopServer(server2, function() {
            done();
          });
        });
      });
    });
  });
});