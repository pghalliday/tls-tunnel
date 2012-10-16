var expect = require('chai').expect,
    Client = require('../../src/Client'),
    Server = require('../../src/Server'),
    fs = require('fs');

var PORT = 8080,
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./test/keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./test/keys/unknown-client-cert.pem'),
    START_PORT = 8081,
    PORT_LIMIT = 3;

var SERVER_OPTIONS = {
  port: PORT,
  key: SERVER_KEY,
  cert: SERVER_CERT,
  ca: [CLIENT_CERT],
  forwardedPorts: {
    start: START_PORT,
    count: PORT_LIMIT
  },
  timeout: 5000
};

describe('Client', function() {
  var server;

  before(function(done) {
    server = new Server(SERVER_OPTIONS);
    server.start(done);
  });

  it('should construct', function() {
    var client = new Client();
  });

  after(function(done) {
    server.stop(done);
  });
});