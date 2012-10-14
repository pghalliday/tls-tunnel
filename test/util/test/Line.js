var expect = require('chai').expect,
    Line = require('../../../src/util/test/Line'),
    CheckList = require('../../../src/util/test/CheckList');
    
describe('Line', function() {
  describe('constructor', function() {
    it('should construct with no arguments', function() {
      var line = new Line();
    });
  });
  
  describe('downstream and upstream fields', function() {
    var line;

    before(function() {
      line = new Line();
    });

    it('should be bot writable and readable', function() {
      expect(line.upstream.readable).to.equal(true);
      expect(line.downstream.readable).to.equal(true);
      expect(line.upstream.writable).to.equal(true);
      expect(line.downstream.writable).to.equal(true);
    });

    it('should cause the other end of the line to emit data and end events on calls to write and end', function(done) {
      var checkList = new CheckList(['hello, downstream', 'hello, upstream', 'goodbye, downstream', 'goodbye, upstream'], function(error) {
        expect(error).to.be.an('undefined');
        done();
      });
      line.downstream.once('data', function(data) {
        checkList.check('hello, downstream');
        line.downstream.write('hello, upstream');
        line.downstream.on('data', function(data) {
          checkList.check('goodbye, downstream');
        });
      });
      line.downstream.on('end', function(data) {
        checkList.check('goodbye, downstream');
        line.downstream.end('goodbye, upstream');
      });
      line.upstream.once('data', function(data) {
        checkList.check('hello, upstream');
        line.upstream.end('goodbye, downstream');
        line.upstream.on('data', function(data) {
          checkList.check('goodbye, upstream');
        });
      });
      line.upstream.on('end', function(data) {
        checkList.check('goodbye, upstream');
      });
      line.upstream.write('hello, downstream');
    });
  });
});
