var expect = require('chai').expect,
    Operator = require('../../../src/Server/Operator'),
    EventEmitter = require('events').EventEmitter,
    Checklist = require('checklist'),
    Tunnel = require('../../../src/util/Tunnel');
       
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

  it('should request downstream connections to match incoming connections from upstream servers and emit a connect event when established', function(done) {
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
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var downstreamControlTunnel = new Tunnel();
    var downstreamTunnel = new Tunnel();
    var upstreamTunnel = new Tunnel();
    var checklist = new Checklist(['open', 'connect', 'This is a test', 'ConnectionString'], done);
    operator.on('connect', function(connectionString) {
      checklist.check(connectionString);
    });
    downstreamControlTunnel.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlTunnel.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
        mockSecureServer.emit('secureConnection', downstreamTunnel.upstream);
        downstreamTunnel.downstream.on('data', function(data) {
          checklist.check(data);
        });
        downstreamTunnel.downstream.write(data);
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlTunnel.upstream);
    downstreamControlTunnel.downstream.write('open');
    upstreamTunnel.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamTunnel.downstream);
    upstreamTunnel.upstream.write('This is a test');
  });

  it('should timeout after 2 seconds by default when requesting downstream connections', function(done) {
    this.timeout(3000);
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
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var downstreamControlTunnel = new Tunnel();
    var downstreamTunnel = new Tunnel();
    var upstreamTunnel = new Tunnel();
    var checklist = new Checklist(['open', 'connect', 'end'], done);
    downstreamControlTunnel.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlTunnel.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlTunnel.upstream);
    downstreamControlTunnel.downstream.write('open');
    upstreamTunnel.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamTunnel.downstream);
    upstreamTunnel.upstream.write('This is a test');
  });

  it('should timeout after the configured period when requesting downstream connections', function(done) {
    this.timeout(1000);
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
    var operator = new Operator(mockSecureServer, mockSwitchboard, 500);
    var downstreamControlTunnel = new Tunnel();
    var downstreamTunnel = new Tunnel();
    var upstreamTunnel = new Tunnel();
    var checklist = new Checklist(['open', 'connect', 'end'], done);
    downstreamControlTunnel.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlTunnel.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlTunnel.upstream);
    downstreamControlTunnel.downstream.write('open');
    upstreamTunnel.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamTunnel.downstream);
    upstreamTunnel.upstream.write('This is a test');
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