var expect = require('chai').expect,
    Range = require('../../../src/Server/Range');
    
var START = 100,
    COUNT = 3;

describe('Range', function() {
  var range;
  
  before(function() {
    range = new Range(START, COUNT);
  });

  describe('#pop', function() {
    it('should return the values in the range in ascending order until there are none left', function(done) {
      range.pop(function(error, value) {
        expect(error).to.equal(null);
        expect(value).to.equal(START);
        range.pop(function(error, value) {
          expect(error).to.equal(null);
          expect(value).to.equal(START + 1);
          range.pop(function(error, value) {
            expect(error).to.equal(null);
            expect(value).to.equal(START + 2);
            range.pop(function(error, value) {
              expect(error.toString()).to.equal((new Error('No more values')).toString());
              done();
            });
          });
        });
      });
    });
  });
  
  describe('#push', function() {
    it('should put popped values back in the range to be reused', function(done) {
      range.push(START + 1, function(error) {
        expect(error).to.be.an('undefined');
        range.push(START + 2, function(error) {
          expect(error).to.be.an('undefined');
          range.pop(function(error, value) {
            expect(error).to.equal(null);
            expect(value).to.equal(START + 2);
            range.pop(function(error, value) {
              expect(error).to.equal(null);
              expect(value).to.equal(START + 1);
              range.pop(function(error, value) {
                expect(error.toString()).to.equal((new Error('No more values')).toString());
                done();
              });
            });
          });
        });
      });
    });
    
    it('should error if a value is pushed that is already available', function(done) {
      range.push(START + 1, function(error) {
        expect(error).to.be.an('undefined');
        range.push(START + 1, function(error) {
          expect(error.toString()).to.equal((new Error('Value has not been popped')).toString());
          done();
        });
      });
    });
    
    it('should error if a value is pushed that is not valid for the array', function(done) {
      range.push(START + 3, function(error) {
        expect(error.toString()).to.equal((new Error('Value is not valid for the range')).toString());
        done();
      });
    });
    
    it('should work without a callback having to be specified', function() {
      range.push(START);
    });
  });
});