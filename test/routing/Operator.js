var expect = require('chai').expect,
    Operator = require('../../src/routing/Operator');
       
describe('Operator', function() {
  var operator;
  
  before(function() {
    operator = new Operator();
  });
  
  describe('#pipe', function() {
    it('should request a new secure connection for forwarding from the target', function(done) {
      operator.pipe();
      done();
    });
  });
});