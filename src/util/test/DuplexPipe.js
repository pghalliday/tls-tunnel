var Stream = require('stream'),
    util = require('util');

function DuplexPipe() {
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

    self.resume = function() {
      paused = false;
      events.forEach(function(event) {
        otherEnd.emit(event.name, event.data);
      });
      events = [];
    };

    self.emitOrBuffer = function(name, data) {
      if (paused) {
        events.push({
          name: name,
          data: data
        });
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
      otherEnd.emitOrBuffer('end', data);
    };
  }
  util.inherits(EndPoint, Stream);
  
  this.upstream = new EndPoint();
  this.downstream = new EndPoint(this.upstream);
}

module.exports = DuplexPipe;