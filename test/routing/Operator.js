var expect = require('chai').expect,
    Operator = require('../../src/routing/Operator'),
    Line = require('../../src/util/test/Line');
       
describe('Operator', function() {
  var operator,
      mockControl,
      mockSecureConnection,
      mockClearConnection;
  
  before(function() {
    mockControl = new Line();
    mockSecureConnection = new Line();
    mockClearConnection = new Line();
    operator = new Operator(mockControl.upstream);
  });
  
  describe('connecting new connections', function() {
    it('should request a new secure connection and forward data to it', function(done) {
      mockControl.downstream.on('data', function(data) {
        expect(data).to.match(/^connect: [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'connect string shouold containa valid UUID v1');
        var matched = operator.connection(mockSecureConnection.upstream, data.substring('connect: '.length));
        expect(matched).to.equal(true);
      }); 
      operator.connect(mockClearConnection.downstream, function() {
        mockSecureConnection.downstream.on('data', function(data) {
          expect(data).to.equal('This is a test');
          mockSecureConnection.downstream.write('This is also a test');
        });
        mockClearConnection.upstream.on('data', function(data) {
          expect(data).to.equal('This is also a test');
          done();
        });
        mockClearConnection.upstream.write('This is a test');
      });
    });
  });
});