var expect = require('chai').expect,
    Switchboard = require('../../src/routing/Switchboard'),
    net = require('net'),
    Line = require('../../src/util/test/Line'),
    CheckList = require('../../src/util/test/CheckList');

var PORT = 8080;

describe('Switchboard', function() {
  var switchboard;
  var mockOperator;
  
  var MockOperator = function() {
    var self = this;
    
    self.setTarget = function(target) {
      self.target = target;
    };
    
    self.connect = function(client, callback) {
      if (self.target) {
        client.pipe(self.target);
        self.target.pipe(client);
      }
      callback();
    };
  }; 
  
  before(function() {
    mockOperator = new MockOperator();
    switchboard = new Switchboard(PORT, mockOperator);
  });
  
  it('should end any open client connections and stop when requested', function(done) {    
    var checkList = new CheckList(['stopped', 'closed'], function(error) {
      expect(error).to.be.an('undefined');
      done();
    });
    
    switchboard.start(function() {
      var client = net.connect({
        port: PORT
      }, function() {
        client.on('close', function() {
          checkList.check('closed');
        });
        switchboard.stop(function() {
          checkList.check('stopped');
        });
      });
    });
  });
  
  describe('once started', function() {
    before(function(done) {
      switchboard.start(done);
    });
    
    it('should request a new stream for each client connection, forward all data to and receive data from it', function(done) {
      var line = new Line();
      mockOperator.setTarget(line.upstream);
      var client = net.connect({
        port: PORT
      }, function() {
        var lineDataEventsReceived = 0,
            clientDataEventsReceived = 0;
        line.downstream.on('data', function(data) {
          lineDataEventsReceived++;
          expect(data.toString()).to.equal('This is a test', 'line data event');
          line.downstream.write('This is also a test');
        });
        line.downstream.on('end', function() {
          expect(lineDataEventsReceived).to.equal(1, 'lineDataEventsReceived');
          expect(clientDataEventsReceived).to.equal(1, 'clientDataEventsReceived');
          done();
        });
        client.on('data', function(data) {
          clientDataEventsReceived++;
          expect(data.toString()).to.equal('This is also a test', 'client data event');
          client.end();
        });
        client.write('This is a test');
      });
    });
    
    after(function(done) {
      switchboard.stop(done);
    });
  });
});