var expect = require('chai').expect,
    DuplexPipe = require('../../../src/util/test/DuplexPipe'),
    CheckList = require('../../../src/util/test/CheckList');
    
describe('DuplexPipe', function() {
  it('should construct with no arguments', function() {
    var duplexPipe = new DuplexPipe();
  });
  
  it('should be both writable and readable', function() {
    var duplexPipe = new DuplexPipe();
    expect(duplexPipe.upstream.readable).to.equal(true);
    expect(duplexPipe.downstream.readable).to.equal(true);
    expect(duplexPipe.upstream.writable).to.equal(true);
    expect(duplexPipe.downstream.writable).to.equal(true);
  });

  it('should cause the other end of the DuplexPipe to emit data and end events on calls to write and end', function(done) {
    var duplexPipe = new DuplexPipe();
    var checkList = new CheckList(['hello, downstream', 'hello, upstream', 'goodbye, downstream', 'goodbye, upstream', 'end upstream', 'end downstream'], done);
    duplexPipe.downstream.once('data', function(data) {
      checkList.check(data);
      duplexPipe.downstream.on('data', function(data) {
        checkList.check(data);
      });
      duplexPipe.downstream.write('hello, upstream');
    });
    duplexPipe.downstream.on('end', function(data) {
      checkList.check('end downstream');
      duplexPipe.downstream.end('goodbye, upstream');
    });
    duplexPipe.upstream.once('data', function(data) {
      checkList.check(data);
      duplexPipe.upstream.on('data', function(data) {
        checkList.check(data);
      });
      duplexPipe.upstream.end('goodbye, downstream');
    });
    duplexPipe.upstream.on('end', function(data) {
      checkList.check('end upstream');
    });
    duplexPipe.upstream.write('hello, downstream');
  });

  it('should support pause and resume', function(done) {
    var duplexPipe = new DuplexPipe();
    var checkList = new CheckList([
      'resume',
      'hello, upstream',
      'hello, downstream'
    ], {
      ordered: true
    }, done);
    duplexPipe.downstream.pause();
    duplexPipe.upstream.pause();
    duplexPipe.upstream.write('hello, downstream');
    duplexPipe.downstream.write('hello, upstream');
    duplexPipe.downstream.on('data', function(data) {
      checkList.check(data);
    });
    duplexPipe.upstream.on('data', function(data) {
      checkList.check(data);
    });
    setTimeout(function() {
      checkList.check('resume');
      duplexPipe.upstream.resume();
      duplexPipe.downstream.resume();
    }, 0);
  });
});
