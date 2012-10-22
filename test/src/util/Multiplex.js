var expect = require('chai').expect,
    Multiplex = require('../../../src/util/Multiplex'),
    Checklist = require('checklist');
    
describe('Multiplex', function() {
  it('should provide multiple readable/writable streams over a single carrier stream', function(done) {
    var checklist = new Checklist([
      'downstream connected',
      'Hello, downstream',
      'Hello, upstream',
      'Goodbye, downstream',
      'end downstream',
      'end upstream'
    ], done);
    var multiplex1 = new Multiplex();
    var multiplex2 = new Multiplex(function(downstreamConnection) {
      checklist.check('downstream connected');
      downstreamConnection.setEncoding();
      downstreamConnection.on('data', function(data) {
        checklist.check(data);
        downstreamConnection.removeAllListeners('data');
        downstreamConnection.on('data', function(data) {
          checklist.check(data);
        });
        downstreamConnection.write('Hello, upstream');
      });
      downstreamConnection.on('end', function(data) {
        checklist.check('end downstream');
      });
    });
    
    multiplex1.pipe(multiplex2);
    multiplex2.pipe(multiplex1);
    
    var upstreamConnection = multiplex1.createStream();
    upstreamConnection.setEncoding();
    upstreamConnection.on('data', function(data) {
      checklist.check(data);
      upstreamConnection.end('Goodbye, downstream');        
    });
    upstreamConnection.on('end', function(data) {
      checklist.check('end upstream');        
    });
    upstreamConnection.write('Hello, downstream');
  });
});
