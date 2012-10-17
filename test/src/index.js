var expect = require('chai').expect,
    lib = require('../../src');
    
describe('index', function() {
  it('should expose the Server class', function() {
    expect(lib.Server).to.not.be.an('undefined');
  });

  it('should expose the Client class', function() {
    expect(lib.Client).to.not.be.an('undefined');
  });
});
