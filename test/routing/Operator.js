var expect = require('chai').expect,
    Operator = require('../../src/routing/Operator'),
    EventEmitter = require('events').EventEmitter,
    CheckList = require('../../src/util/test/CheckList'),
    DuplexPipe = require('../../src/util/test/DuplexPipe');
       
describe('Operator', function() {  
  it('should respond to open requests with the success responses from the switchboard', function(done) {
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
    var duplexPipe = new DuplexPipe();
    duplexPipe.downstream.on('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      done();
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
    var checkList = new CheckList(['end', 'data'], done);
    duplexPipe.downstream.on('data', function(data) {
      expect(data).to.equal('open:error:Something went wrong');
      checkList.check('data');
    });
    duplexPipe.downstream.on('end', function() {
      checkList.check('end');
    });
    mockSecureServer.emit('secureConnection', duplexPipe.upstream);
    duplexPipe.downstream.write('open');
  });

  it('should request downstream connections to match incoming connections from upstream servers', function(done) {
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
    var checkList = new CheckList(['open', 'connect', 'data'], done);
    downstreamControlDuplexPipe.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checkList.check('open');
      downstreamControlDuplexPipe.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checkList.check('connect');
        mockSecureServer.emit('secureConnection', downstreamDuplexPipe.upstream);
        downstreamDuplexPipe.downstream.on('data', function(data) {
          expect(data).to.equal('This is a test');
          checkList.check('data');
        });
        downstreamDuplexPipe.downstream.write(data);
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlDuplexPipe.upstream);
    downstreamControlDuplexPipe.downstream.write('open');
    upstreamDuplexPipe.upstream.on('end', function() {
      checkList.check('end');
    });
    mockServer.emit('connection', upstreamDuplexPipe.downstream);
    upstreamDuplexPipe.upstream.write('This is a test');
  });

  it('should timeout after the configured period when requesting downstream connections', function(done) {
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
    var operator = new Operator(mockSecureServer, mockSwitchboard, 100);
    var downstreamControlDuplexPipe = new DuplexPipe();
    var downstreamDuplexPipe = new DuplexPipe();
    var upstreamDuplexPipe = new DuplexPipe();
    var checkList = new CheckList(['open', 'connect', 'end'], done);
    downstreamControlDuplexPipe.downstream.once('data', function(data) {
      expect(data).to.equal('open:success:ConnectionString');
      checkList.check('open');
      downstreamControlDuplexPipe.downstream.on('data', function(data) {
        expect(data).to.match(/^connect:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        checkList.check('connect');
      });
    });
    mockSecureServer.emit('secureConnection', downstreamControlDuplexPipe.upstream);
    downstreamControlDuplexPipe.downstream.write('open');
    upstreamDuplexPipe.upstream.on('end', function() {
      checkList.check('end');
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
        callback();
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
        checkList.check(server);
        callback();
      }
    };
    var operator = new Operator(mockSecureServer, mockSwitchboard);
    var duplexPipe1 = new DuplexPipe();
    var duplexPipe2 = new DuplexPipe();
    var duplexPipe3 = new DuplexPipe();
    
    var checkList = new CheckList([
      duplexPipe1,
      duplexPipe2, 
      duplexPipe3, 
      mockServer, 
      mockServer, 
      mockServer, 
      operator
    ], done);
    
    duplexPipe1.downstream.on('end', function() {
      checkList.check(duplexPipe1);
    });
    duplexPipe2.downstream.on('end', function() {
      checkList.check(duplexPipe2);
    });
    duplexPipe3.downstream.on('end', function() {
      checkList.check(duplexPipe3);
    });
    mockSecureServer.emit('secureConnection', duplexPipe1.upstream);
    mockSecureServer.emit('secureConnection', duplexPipe2.upstream);
    mockSecureServer.emit('secureConnection', duplexPipe3.upstream);
    duplexPipe1.downstream.write('open');
    duplexPipe2.downstream.write('open');
    duplexPipe3.downstream.write('open');
    
    operator.cleanUp(function() {
      checkList.check(operator);
    });
  });
});