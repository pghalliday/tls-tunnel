var expect = require('chai').expect,
    Operator = require('../../../src/Server/Operator'),
    EventEmitter = require('events').EventEmitter,
    Checklist = require('checklist'),
    Tunnel = require('tunnel-stream');
       
describe('Operator', function() {  
  it('should respond to open requests with the success responses from the switchboard and emit an open event', function(done) {
    var mockSecureServer = new EventEmitter();
    var mockServer = new EventEmitter();
    mockServer.getConnectionString = function() {
      return 'ConnectionString';
    };
    var mockSwitchboard = {
      startServer: function(callback) {
        callback(null, mockServer);
      }
    };
    var tunnel = new Tunnel();
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var checklist = new Checklist(['ConnectionString', 'open:success:ConnectionString'], done);
    operator.on('open', function(connectionString) {
      checklist.check(connectionString);
    });
    tunnel.downstream.setEncoding();
    tunnel.downstream.on('data', function(data) {
      checklist.check(data);
    });
    mockSecureServer.emit('secureConnection', tunnel.upstream);
    tunnel.downstream.write('open');
  });

  it('should respond to open requests with the error responses from the switchboard and end the connection immediately', function(done) {
    var mockSecureServer = new EventEmitter();
    var mockSwitchboard = {
      startServer: function(callback) {
        callback(new Error('Something went wrong'));
      }
    };
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var tunnel = new Tunnel();
    var checklist = new Checklist(['end', 'data'], done);
    tunnel.downstream.setEncoding();
    tunnel.downstream.on('data', function(data) {
      expect(data).to.equal('open:error:Something went wrong');
      checklist.check('data');
    });
    tunnel.downstream.on('end', function() {
      checklist.check('end');
    });
    mockSecureServer.emit('secureConnection', tunnel.upstream);
    tunnel.downstream.write('open');
  });

  it('should stop upstream servers when the downstream control sockets are disconnected', function(done) {
    var mockSecureServer = new EventEmitter();
    var mockServer = new EventEmitter();
    mockServer.getConnectionString = function() {
      return 'ConnectionString';
    };
    var mockSwitchboard = {
      startServer: function(callback) {
        callback(null, mockServer);
      },
      stopServer: function(server, callback) {
        expect(server).to.equal(mockServer);
        if (callback) {
          callback();
        }
        done();
      }
    };
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var tunnel = new Tunnel();
    tunnel.downstream.setEncoding();
    tunnel.downstream.on('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      tunnel.downstream.end();
    });
    mockSecureServer.emit('secureConnection', tunnel.upstream);
    tunnel.downstream.write('open');    
  });

  it('should keep track of all downstream connections and upstream servers and end/close them when cleaned up', function(done) {
    var mockSecureServer = new EventEmitter();
    var mockServer = new EventEmitter();
    mockServer.getConnectionString = function() {
      return 'ConnectionString';
    };
    var mockSwitchboard = {
      startServer: function(callback) {
        callback(null, mockServer);
      },
      stopServer: function(server, callback) {
        checklist.check(server);
        if (callback) {
          callback();
        }
      }
    };
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var tunnel1 = new Tunnel();
    var tunnel2 = new Tunnel();
    var tunnel3 = new Tunnel();
    
    var checklist = new Checklist([
      tunnel1,
      tunnel2, 
      tunnel3, 
      mockServer, 
      mockServer, 
      mockServer, 
      operator
    ], done);
    
    tunnel1.downstream.on('end', function() {
      checklist.check(tunnel1);
    });
    tunnel2.downstream.on('end', function() {
      checklist.check(tunnel2);
    });
    tunnel3.downstream.on('end', function() {
      checklist.check(tunnel3);
    });
    mockSecureServer.emit('secureConnection', tunnel1.upstream);
    mockSecureServer.emit('secureConnection', tunnel2.upstream);
    mockSecureServer.emit('secureConnection', tunnel3.upstream);
    tunnel1.downstream.write('open');
    tunnel2.downstream.write('open');
    tunnel3.downstream.write('open');
    
    operator.cleanUp(function() {
      checklist.check(operator);
    });
  });
});