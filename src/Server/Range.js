function Range(start, count) {
  var self = this;
  var available = [];
  for (var value = start + count; value > start; value--) {
    available.push(value - 1);
  }
  
  self.pop = function(callback) {
    if (available.length > 0) {
      callback(null, available.pop());
    } else {
      callback(new Error('No more values'));
    }
  };
  
  self.push = function(value, callback) {
    if (value >= start && value < start + count) {
      if (available.indexOf(value) === -1) {
        available.push(value);
        if (callback) {
          callback();
        }
      } else {
        if (callback) {
          callback(new Error('Value has not been popped'));
        }
      }
    } else {
      if (callback) {
        callback(new Error('Value is not valid for the range'));
      }
    }
  };
}

module.exports = Range;