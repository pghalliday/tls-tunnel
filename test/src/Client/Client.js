var expect = require('chai').expect,
    Client = require('../../../src/Client/Client'),
    Server = require('../../../src/Server/Server'),
    fs = require('fs'),
    Checklist = require('../../../src/util/test/Checklist'),
    tls = require('tls'),
    net = require('net');

var HOST = '127.0.0.1',
    PORT = 8080,
    TARGET_PORT = 8000,
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_SERVER_KEY = fs.readFileSync('./test/keys/unknown-server-key.pem'),
    UNKNOWN_SERVER_CERT = fs.readFileSync('./test/keys/unknown-server-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./test/keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./test/keys/unknown-client-cert.pem');

describe('Client', function() {
  it('should timeout if the server does not respond to an open request', function(done) {
    var checklist = new Checklist([(new Error('Open request timed out')).toString(), 'closed'], done);
    var server = tls.createServer({
      key: SERVER_KEY,
      cert: SERVER_CERT,
      requestCert: true,
      rejectUnauthorized: true,
      ca: [CLIENT_CERT]
    });
    server.listen(PORT, function() {
      var client = new Client({
        host: HOST,
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        targetPort: TARGET_PORT,
        timeout: 100
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
        server.close(function() {
          checklist.check('closed');
        });
      });
    });
  });

  describe('with mock server', function() {
    var server = tls.createServer({
      key: SERVER_KEY,
      cert: SERVER_CERT,
      requestCert: true,
      rejectUnauthorized: true,
      ca: [CLIENT_CERT]
    });

    before(function(done) {
      server.listen(PORT, done);
    });

    it('should connect to the server, send the open request and callback once the server responds correctly', function(done) {
      var checklist = new Checklist(['connected', 'open', null, 'ConnectionString', 'disconnected'], function(error) {
        server.removeAllListeners('secureConnection');
        done(error);
      });
      server.on('secureConnection', function(connection) {
        checklist.check('connected');
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          checklist.check(data);
          connection.write('open:success:ConnectionString');
        });
      });
      var client = new Client({
        host: HOST,
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        targetPort: TARGET_PORT,
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

    it('should handle open errors correctly', function(done) {
      var checklist = new Checklist([(new Error('Server rejected connection: No ports available')).toString(), 'undefined'], function(error) {
        server.removeAllListeners('secureConnection');
        done(error);
      });
      server.on('secureConnection', function(connection) {
        connection.on('data', function(data) {
          connection.end('open:error:No ports available');
        });
      });
      var client = new Client({
        host: HOST,
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [SERVER_CERT],
        targetPort: TARGET_PORT,
        timeout: 5000
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
        checklist.check(typeof port);
      });
    });

    after(function(done) {
      server.close(done);
    });
  });
});