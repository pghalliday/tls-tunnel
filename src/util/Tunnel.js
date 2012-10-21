var Stream = require('stream'),
    util = require('util');

function Tunnel() {
  function EndPoint(otherEnd) {
    var self = this,
        paused = false,
        events = [];

    if (otherEnd) {
      otherEnd.pair(self);
    }

    self.writable = true;
    self.readable = true;

    self.pair = function(endPoint) {
      otherEnd = endPoint;
    };

    self.pause = function() {
      paused = true;
    };

    self.resume = function(discardEvents) {
      paused = false;
      while (events.length > 0) {
        var event = events.shift();
        self.emit(event.name, event.data);        
      }
    };
    
    self.discardBufferedEvents = function() {
      events = [];
    };

    self.emitOrBuffer = function(name, data) {
      if (paused) {
        events.push({
          name: name,
          data: data
        });
        if (name === 'data') {
          self.emit('pausedData', data);
        }
      } else {
        self.emit(name, data);
      }      
    };

    self.write = function(data) {
      otherEnd.emitOrBuffer('data', data);
    };
    
    self.end = function(data) {
      if (data) {
        otherEnd.emitOrBuffer('data', data);
      }
      otherEnd.emitOrBuffer('end');
      self.emitOrBuffer('end');
    };
    
    self.setEncoding = function(encoding) {
      // This is only here to allow for tests and those tests always submit strings as utf8
    };
  }
  util.inherits(EndPoint, Stream);
  
  this.upstream = new EndPoint();
  this.downstream = new EndPoint(this.upstream);
}

module.exports = Tunnel;