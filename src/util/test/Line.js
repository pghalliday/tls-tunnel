var Stream = require('stream');

function Line() {
  var self = this,
      upstream = new Stream(),
      downstream = new Stream();
  
  upstream.writable = true;
  downstream.writable = true;
  upstream.readable = true;
  downstream.readable = true;
  
  upstream.write = function(data) {
    downstream.emit('data', data);
  };
  
  upstream.end = function(data) {
    if (data) {
      downstream.emit('data', data);      
    }
    downstream.emit('end', data);
  };
  
  downstream.write = function(data) {
    upstream.emit('data', data);
  };
  
  downstream.end = function(data) {
    if (data) {
      upstream.emit('data', data);
    }
    upstream.emit('end', data);
  };
  
  self.upstream = upstream;
  self.downstream = downstream;
}

module.exports = Line;