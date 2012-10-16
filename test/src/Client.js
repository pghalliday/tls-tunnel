var expect = require('chai').expect,
    Client = require('../../src/Client'),
    Server = require('../../src/Server'),
    fs = require('fs'),
    Checklist = require('../../src/util/test/Checklist'),
    tls = require('tls'),
    net = require('net');

var HOST = '127.0.0.1',
    PORT = 8080,
    TARGET_PORT = 8000,
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

  describe('with a real server', function() {
    var server;

    before(function(done) {
      server = new Server(SERVER_OPTIONS);
      server.start(done);
    });

    it('should connect to the server and trigger a port to be opened', function(done) {
      var checklist = new Checklist([START_PORT, null, '' + START_PORT, 'disconnected'], done);
      server.once('open', function(port) {
        checklist.check(port);
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

    it('should error when trying to connect to a server with an incorrect server certificate', function(done) {
      var checklist = new Checklist([(new Error('DEPTH_ZERO_SELF_SIGNED_CERT')).toString()], done);
      var client = new Client({
        host: HOST,
        port: PORT,
        key: CLIENT_KEY,
        cert: CLIENT_CERT,
        ca: [UNKNOWN_CERT],
        targetPort: TARGET_PORT,
        timeout: 5000
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
      });
    });

    it('should error when trying to connect to a server with an incorrect client certificate', function(done) {
      var checklist = new Checklist(['Error: socket hang up'], done);
      var client = new Client({
        host: HOST,
        port: PORT,
        key: UNKNOWN_KEY,
        cert: UNKNOWN_CERT,
        ca: [SERVER_CERT],
        targetPort: TARGET_PORT,
        timeout: 5000
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
      });
    });

    describe('once connected', function() {
      var client;
      var forwardedPort;
      var targetServer;

      before(function(done) {
        targetServer = net.createServer();
        targetServer.listen(TARGET_PORT, function() {
          client = new Client({
            host: HOST,
            port: PORT,
            key: CLIENT_KEY,
            cert: CLIENT_CERT,
            ca: [SERVER_CERT],
            targetPort: TARGET_PORT,
            timeout: 5000
          });
          client.connect(function(error, port) {
            forwardedPort = port;
            done();
          });
        });
      });

      it('should open a new secure connection when connections are made on the forwarded port and a new connection to the target server', function(done) {
        var checklist = new Checklist(['connect', 'end', 'connection'], done);
        server.once('connect', function() {
          checklist.check('connect');
        });
        targetServer.once('connection', function(connection) {
          checklist.check('connection');
        });
        var connection = net.connect({
          host: HOST,
          port: forwardedPort
        }, function() {
          connection.on('end', function() {
            checklist.check('end');
          });
          connection.end();
        });
      });

      describe('and a connection is made to the forwarded port', function() {
        var forwardedConnection;
        var targetConnection;

        before(function(done) {
          var checklist = new Checklist(['forwardedConnection', 'targetConnection'], done);
          targetServer.once('connection', function(connection) {
            targetConnection = connection;
            targetConnection.setEncoding('utf8');
            checklist.check('targetConnection');
          });
          forwardedConnection = net.connect({
            host: HOST,
            port: forwardedPort
          }, function() {
            checklist.check('forwardedConnection');
          });
          forwardedConnection.setEncoding('utf8');
        });

        it('should forward data written to the forwarded port to the target server and vice versa', function(done) {
          var checklist = new Checklist(['This is a test', 'This is also a test'], done);
          targetConnection.once('data', function(data) {
            checklist.check(data);
            targetConnection.write('This is also a test');
          });
          forwardedConnection.once('data', function(data) {
            checklist.check(data);
          });
          forwardedConnection.write('This is a test');
        });

        after(function(done) {
          forwardedConnection.on('end', done);
          forwardedConnection.end();
        });
      });

      after(function(done) {
        client.disconnect(function() {
          targetServer.close(done);
        });
      });
    });

    after(function(done) {
      server.stop(done);
    });
  });
});