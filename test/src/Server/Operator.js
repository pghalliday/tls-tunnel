var expect = require('chai').expect,
    Operator = require('../../../src/Server/Operator'),
    EventEmitter = require('events').EventEmitter,
    Checklist = require('checklist'),
    DuplexPipe = require('../../../src/util/test/DuplexPipe');
       
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
    var duplexPipe = new DuplexPipe();
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var checklist = new Checklist(['ConnectionString', 'open:success:ConnectionString'], done);
    operator.on('open', function(connectionString) {
      checklist.check(connectionString);
    });
    duplexPipe.downstream.on('data', function(data) {
      checklist.check(data);
    });
    mockSecureServer.emit('secureConnection', duplexPipe.upstream);
    duplexPipe.downstream.write('open');
  });

  it('should respond to open requests with the error responses from the switchboard and end the connection immediately', function(done) {
    var mockSecureServer = new EventEmitter();
    var mockSwitchboard = {
      startServer: function(callback) {
        callback(new Error('Something went wrong'));
      }
    };
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var duplexPipe = new DuplexPipe();
    var checklist = new Checklist(['end', 'data'], done);
    duplexPipe.downstream.on('data', function(data) {
      expect(data).to.equal('open:error:Something went wrong');
      checklist.check('data');
    });
    duplexPipe.downstream.on('end', function() {
      checklist.check('end');
    });
    mockSecureServer.emit('secureConnection', duplexPipe.upstream);
    duplexPipe.downstream.write('open');
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
    var downstreamControlDuplexPipe = new DuplexPipe();
    var downstreamDuplexPipe = new DuplexPipe();
    var upstreamDuplexPipe = new DuplexPipe();
    var checklist = new Checklist(['open', 'connect', 'This is a test', 'ConnectionString'], done);
    operator.on('connect', function(connectionString) {
      checklist.check(connectionString);
    });
    downstreamControlDuplexPipe.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlDuplexPipe.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
        mockSecureServer.emit('secureConnection', downstreamDuplexPipe.upstream);
        downstreamDuplexPipe.downstream.on('data', function(data) {
          checklist.check(data);
        });
        downstreamDuplexPipe.downstream.write(data);
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlDuplexPipe.upstream);
    downstreamControlDuplexPipe.downstream.write('open');
    upstreamDuplexPipe.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamDuplexPipe.downstream);
    upstreamDuplexPipe.upstream.write('This is a test');
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
    var downstreamControlDuplexPipe = new DuplexPipe();
    var downstreamDuplexPipe = new DuplexPipe();
    var upstreamDuplexPipe = new DuplexPipe();
    var checklist = new Checklist(['open', 'connect', 'end'], done);
    downstreamControlDuplexPipe.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlDuplexPipe.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlDuplexPipe.upstream);
    downstreamControlDuplexPipe.downstream.write('open');
    upstreamDuplexPipe.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamDuplexPipe.downstream);
    upstreamDuplexPipe.upstream.write('This is a test');
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
    var downstreamControlDuplexPipe = new DuplexPipe();
    var downstreamDuplexPipe = new DuplexPipe();
    var upstreamDuplexPipe = new DuplexPipe();
    var checklist = new Checklist(['open', 'connect', 'end'], done);
    downstreamControlDuplexPipe.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checklist.check('open');
      downstreamControlDuplexPipe.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checklist.check('connect');
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlDuplexPipe.upstream);
    downstreamControlDuplexPipe.downstream.write('open');
    upstreamDuplexPipe.upstream.on('end', function() {
      checklist.check('end');
    });
    mockServer.emit('connection', upstreamDuplexPipe.downstream);
    upstreamDuplexPipe.upstream.write('This is a test');
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
    var duplexPipe = new DuplexPipe();
    duplexPipe.downstream.on('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      duplexPipe.downstream.end();
    });
    mockSecureServer.emit('secureConnection', duplexPipe.upstream);
    duplexPipe.downstream.write('open');    
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
    var duplexPipe1 = new DuplexPipe();
    var duplexPipe2 = new DuplexPipe();
    var duplexPipe3 = new DuplexPipe();
    
    var checklist = new Checklist([
      duplexPipe1,
      duplexPipe2, 
      duplexPipe3, 
      mockServer, 
      mockServer, 
      mockServer, 
      operator
    ], done);
    
    duplexPipe1.downstream.on('end', function() {
      checklist.check(duplexPipe1);
    });
    duplexPipe2.downstream.on('end', function() {
      checklist.check(duplexPipe2);
    });
    duplexPipe3.downstream.on('end', function() {
      checklist.check(duplexPipe3);
    });
    mockSecureServer.emit('secureConnection', duplexPipe1.upstream);
    mockSecureServer.emit('secureConnection', duplexPipe2.upstream);
    mockSecureServer.emit('secureConnection', duplexPipe3.upstream);
    duplexPipe1.downstream.write('open');
    duplexPipe2.downstream.write('open');
    duplexPipe3.downstream.write('open');
    
    operator.cleanUp(function() {
      checklist.check(operator);
    });
  });
});