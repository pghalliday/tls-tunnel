var expect = require('chai').expect,
    CheckList = require('./CheckList');

describe('CheckList', function() {
  it('should callback immediately if there are no items to check off', function(done) {
    var checkList = new CheckList([], function(error) {
      expect(error).to.be.an('undefined');
      done();
    });
  });
  
  it('should callback once all the items have been checked off', function(done) {
    var checkList = new CheckList(['test', 5, 'hello'], function(error) {
      expect(error).to.be.an('undefined');
      done();
    });
    checkList.check(5);
    checkList.check('hello');
    checkList.check('test');
  });

  it('should callback with an error if an item is checked off that we are not waiting for', function(done) {
    var checkList = new CheckList(['test', 5, 'hello'], function(error) {
      expect(error.toString()).to.equal((new Error('Not waiting for item: goodbye')).toString());
      done();
    });
    checkList.check(5);
    checkList.check('hello');
    checkList.check('goodbye');
  });
  
  it('should callback with an error if an item is checked off twice', function(done) {
    var checkList = new CheckList(['test', 5, 'hello'], function(error) {
      expect(error.toString()).to.equal((new Error('Not waiting for item: hello')).toString());
      done();
    });
    checkList.check(5);
    checkList.check('hello');
    checkList.check('hello');
  });
  
  it('should not callback again after error', function() {
    var callbackCount = 0;
    var checkList = new CheckList(['test', 5, 'hello'], function(error) {
      expect(error.toString()).to.equal((new Error('Not waiting for item: hello')).toString());
      callbackCount++;
    });
    checkList.check(5);
    checkList.check('hello');
    checkList.check('hello');
    checkList.check('hello');
    checkList.check('test');
    expect(callbackCount).to.equal(1);
  });
  
  it('should throw an error if checked again after completion', function() {
    var callbackCount = 0;
    var checkList = new CheckList(['test', 5, 'hello'], function(error) {
      expect(error).to.be.an('undefined');
      callbackCount++;
    });
    checkList.check(5);
    checkList.check('hello');
    checkList.check('test');
    expect(callbackCount).to.equal(1, 'callbackCount');
    
    var errorCount = 0;
    try {
      checkList.check('hello');
    } catch(error) {
      expect(error.toString()).to.equal((new Error('Not waiting for item as already reported completion: hello')).toString());
      errorCount++;
    }
    expect(errorCount).to.equal(1, 'errorCount');
  });
});