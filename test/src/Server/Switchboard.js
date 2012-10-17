var expect = require('chai').expect,
    Switchboard = require('../../../src/Server/Switchboard'),
    Range = require('../../../src/util/Range'),
    Checklist = require('../../../src/util/test/Checklist'),
    net = require('net');

var START_PORT = 8081,
    PORT_COUNT = 3;

describe('Switchboard', function() {
  it('should start servers listening on ports in the given range until no more ports remain', function(done) {
    var switchboard = new Switchboard(new Range(START_PORT, PORT_COUNT));
    var servers = [];

    var checklist = new Checklist([
      (new Error('No more ports available')).toString(),
      'connection:8081',
      'connect:8081',
      'connection:8082',
      'connect:8082',
      'connection:8083',
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
      server.on('connection', function(connection) {
        checklist.check('connection:8081');
      });
      net.connect({
        port: 8081
      }, function() {
        checklist.check('connect:8081');
      });
    });

    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      expect(server.getConnectionString()).to.equal('8082');
      servers.push(server);
      server.on('connection', function(connection) {
        checklist.check('connection:8082');
      });
      net.connect({
        port: 8082
      }, function() {
        checklist.check('connect:8082');
      });
    });

    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      expect(server.getConnectionString()).to.equal('8083');
      servers.push(server);
      server.on('connection', function(connection) {
        checklist.check('connection:8083');
      });
      net.connect({
        port: 8083
      }, function() {
        checklist.check('connect:8083');
      });
    });

    switchboard.startServer(function(error, server) {
      checklist.check(error.toString());
    });
  });

  it('should reuse ports after servers are stopped', function(done) {
    var switchboard = new Switchboard(new Range(START_PORT, PORT_COUNT));
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

  it('should be possible to start and stop a server independently', function(done) {
    var switchboard = new Switchboard(new Range(START_PORT, PORT_COUNT));
    switchboard.startServer(function(error, server) {
      expect(error).to.equal(null);
      net.connect({
        port: 8081
      }, function() {
        switchboard.stopServer(server, function() {
          done();
        });
      });
    });
  });
});