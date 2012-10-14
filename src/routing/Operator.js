var uuid = require('node-uuid');

function Operator(control) {
  var self = this,
      waitingConnections = {};
  
  self.connect = function(clearConnection, callback) {
    var id = uuid.v1();
    waitingConnections[id] = {
      clearConnection: clearConnection,
      callback: callback
    };
    control.write('connect: ' + id);
  };
  
  self.connection = function(secureConnection, id) {
    var matched = false;
    if (waitingConnections[id]) {
      var callback = waitingConnections[id].callback,
          clearConnection = waitingConnections[id].clearConnection;
      delete waitingConnections[id];
      clearConnection.pipe(secureConnection);
      secureConnection.pipe(clearConnection);
      callback();
      matched = true;
    }
    return matched;
  };
}

module.exports = Operator;