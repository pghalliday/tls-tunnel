var expect = require('chai').expect,
    DuplexPipe = require('../../../../src/util/test/DuplexPipe'),
    Checklist = require('../../../../src/util/test/Checklist');
    
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
    var checklist = new Checklist(['hello, downstream', 'hello, upstream', 'goodbye, downstream', 'end upstream', 'end downstream'], done);
    duplexPipe.downstream.once('data', function(data) {
      checklist.check(data);
      duplexPipe.downstream.on('data', function(data) {
        checklist.check(data);
      });
      duplexPipe.downstream.write('hello, upstream');
    });
    duplexPipe.downstream.on('end', function(data) {
      checklist.check('end downstream');
    });
    duplexPipe.upstream.once('data', function(data) {
      checklist.check(data);
      duplexPipe.upstream.end('goodbye, downstream');
    });
    duplexPipe.upstream.on('end', function(data) {
      checklist.check('end upstream');
    });
    duplexPipe.upstream.write('hello, downstream');
  });

  it('should support pause and resume', function(done) {
    var duplexPipe = new DuplexPipe();
    var checklist = new Checklist([
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
      checklist.check(data);
    });
    duplexPipe.upstream.on('data', function(data) {
      checklist.check(data);
    });
    setTimeout(function() {
      checklist.check('resume');
      duplexPipe.upstream.resume();
      duplexPipe.downstream.resume();
    }, 0);
  });
  
  it('should support the setEncoding method', function() {
    var duplexPipe = new DuplexPipe();
    duplexPipe.upstream.setEncoding('utf8');
    duplexPipe.downstream.setEncoding('utf8');
  });
  
  it('should emit end events on both streams on end from one side', function(done) {
    var duplexPipe = new DuplexPipe();
    var checklist = new Checklist(['end upstream', 'end downstream', 'This is a test'], done);
    duplexPipe.upstream.on('end', function() {
      checklist.check('end upstream');
    });
    duplexPipe.downstream.on('data', function(data) {
      checklist.check('This is a test');
    });
    duplexPipe.downstream.on('end', function() {
      checklist.check('end downstream');
    });
    duplexPipe.upstream.end('This is a test');
  });
});
