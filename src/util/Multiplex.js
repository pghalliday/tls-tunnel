var util = require('util'),
    uuid = require('node-uuid'),
    Stream = require('stream');

var END_EVENT = 0,
    DATA_EVENT = 1;

function encodeEvent(event) {
  var tunnelIdBuffer = new Buffer(event.tunnelId, 'utf8');
  var tunnelIdLength = tunnelIdBuffer.length;
  var length = 2 + tunnelIdLength + (event.type === DATA_EVENT ? event.buffer.length : 0);
  var encodedBuffer = new Buffer(length);
  encodedBuffer.writeUInt8(tunnelIdLength, 0);
  tunnelIdBuffer.copy(encodedBuffer, 1);
  encodedBuffer.writeUInt8(event.type, tunnelIdLength + 1);
  if (event.type === DATA_EVENT) {
    event.buffer.copy(encodedBuffer, tunnelIdLength + 2);
  }
  return encodedBuffer;
}

function decodeEvent(encodedBuffer) {
  var event = {};
  var tunnelIdLength = encodedBuffer.readUInt8(0);
  event.tunnelId = encodedBuffer.toString('utf8', 1, tunnelIdLength + 1);
  event.type = encodedBuffer.readUInt8(tunnelIdLength + 1);
  if (event.type === DATA_EVENT) {
    event.buffer = encodedBuffer.slice(tunnelIdLength + 2);
  }
  return event;
}

function Tunnel(id, multiplex) {
  var self = this;
  
  self.readable = true;
  self.writable = true;
  
  self.write = function(data, encoding) {
    var buffer = Buffer.isBuffer(data) ? data : new Buffer(data, encoding);
    multiplex.emit('data', encodeEvent({
      tunnelId: id,
      type: DATA_EVENT,
      buffer: buffer
    }));
  };
  
  self.setEncoding = function(encoding) {
    self.encoding = encoding ? encoding : 'utf8';
  };
  
  self.end = function(data, encoding) {
    if (data) {
      self.write(data, encoding);
    }
    multiplex.emit('data', encodeEvent({
      tunnelId: id,
      type: END_EVENT
    }));
    multiplex.delete(id);
    self.emit('end');
  };
}
util.inherits(Tunnel, Stream);

function Multiplex(callback) {
  var self = this,
      tunnels = {};
  
  self.readable = true;
  self.writable = true;

  if (callback) {
    self.on('connection', callback);
  }

  function registerTunnel(id, tunnel) {
    tunnels[id] = tunnel;
    tunnel.on('end', function() {
      delete tunnels[id];
    });
  }

  self.createStream = function(callback){
    var id = uuid.v1();
    var tunnel = new Tunnel(id, self);
    registerTunnel(id, tunnel);
    return tunnel;
  };

  self.delete = function(id) {
    delete tunnels[id];
  };

  self.write = function(buffer) {
    var event = decodeEvent(buffer);
    var tunnel = tunnels[event.tunnelId];
    if (event.type === END_EVENT) {
      if (tunnel) {
        delete tunnels[event.tunnelId];
        tunnel.emit('end');
      }
    } else if (event.type === DATA_EVENT) {
      if (!tunnel) {
        tunnel = new Tunnel(event.tunnelId, self);
        registerTunnel(event.tunnelId, tunnel);
        self.emit('connection', tunnel);
      }
      if (tunnel.encoding) {
        event.buffer = event.buffer.toString(tunnel.encoding);
      }
      tunnel.emit('data', event.buffer);
    }
  };
  
  self.end = function() {
    Object.keys(tunnels).forEach(function(id) {
      tunnels[id].emit('end');
      delete tunnels[id];
    });
    self.emit('end');
  };
}
util.inherits(Multiplex, Stream);

module.exports = Multiplex;