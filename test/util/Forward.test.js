var expect = require('chai').expect,
    Forward = require('../../src/util/Forward'),
    net = require('net'),
    Sink = require('pipette').Sink,
    CheckList = require('../testSupport/CheckList');

var PORT = 8080;

describe('Forward', function() {
  var forward,
      sink,
      target = {
        getSink: null,
        pipe: function(connection, callback) {
          if (target.getSink) {
            target.getSink(connection);
          }
          callback();
        }
      }; 
  
  before(function() {
    forward = new Forward(PORT, target);
  });
  
  it('should end any open client connections and stop when requested', function(done) {
    var checkList = new CheckList(['stopped', 'closed'], function(error) {
      expect(error).to.be.an('undefined');
      done();
    });
    forward.start(function() {
      var client = net.connect({
        port: PORT
      }, function() {
        client.on('close', function() {
          checkList.check('closed');
        });
        forward.stop(function() {
          checkList.check('stopped');
        });
      });
    });
  });
  
  describe('once started', function() {
    before(function(done) {
      forward.start(done);
    });
    
    it('should request a new stream for each client connection and forward all data to it', function(done) {
      target.getSink = function(connection) {
        var sink = new Sink(connection, {
          encoding: 'utf8'
        });
        sink.on('data', function(data) {
          expect(data).to.equal('This is a test');
          target.getSink = null;
          done();
        });
        return sink;
      };
      var client = net.connect({
        port: PORT
      }, function() {
        client.write('This is a test');
        client.end();
      });
    });
    
    after(function(done) {
      forward.stop(done);
    });
  });
});