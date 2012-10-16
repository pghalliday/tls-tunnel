var expect = require('chai').expect,
    Client = require('../../src/Client'),
    Server = require('../../src/Server'),
    fs = require('fs'),
    Checklist = require('../../src/util/test/Checklist');

var PORT = 8080,
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_KEY = fs.readFileSync('./test/keys/unknown-key.pem'),
    UNKNOWN_CERT = fs.readFileSync('./test/keys/unknown-cert.pem'),
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

  it('should connect to the server and trigger a port to be opened', function(done) {
    var checklist = new Checklist([START_PORT, null, START_PORT, 'disconnected'], done);
    server.once('open', function(port) {
      checklist.check(port);
    });
    var client = new Client({
      host: '127.0.0.1',
      port: 8080,
      key: CLIENT_KEY,
      cert: CLIENT_CERT,
      ca: [SERVER_CERT],
      targetPort: 8000,
      timeout: 5000
    });
    client.connect(function(error, port) {
      checklist.check(error);
      checklist.check(port);
      client.disconnect(function() {
        checklist.check('disconnected');
      });
    });
  });

  after(function(done) {
    server.stop(done);
  });
});