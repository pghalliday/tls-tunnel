function CheckList(items, callback) {
  var self = this;
  var calledBack = false;
  var complete = false;
  
  if (items.length === 0) {
    calledBack = true;
    complete = true;
    callback();
  }
  
  self.check = function(item) {
    if (calledBack) {
      if (complete) {
        throw(new Error('Not waiting for item as already reported completion: ' + item));
      }
    } else {
      var index = items.indexOf(item);
      if (index === -1) {
        calledBack = true;
        callback(new Error('Not waiting for item: ' + item));
      } else {
        items.splice(index, 1);
        if (items.length === 0) {
          calledBack = true;
          complete = true;
          callback();
        }
      }
    }
  };
}

module.exports = CheckList;