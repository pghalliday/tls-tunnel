var expect = require('chai').expect,
    Client = require('../../../src/Client/Client'),
    fs = require('fs'),
    Checklist = require('checklist'),
    tls = require('tls'),
    net = require('net'),
    SingleTlsTunnelServer = require('single-tls-tunnel').Server;

var HOST = '127.0.0.1',
    PORT = 8080,
    FORWARDED_PORT = 8081,
    TARGET_PORT = 8000,
    TARGET_HOST = 'localhost',
    SERVER_KEY = fs.readFileSync('./test/keys/server-key.pem'),
    SERVER_CERT = fs.readFileSync('./test/keys/server-cert.pem'),
    CLIENT_KEY = fs.readFileSync('./test/keys/client-key.pem'),
    CLIENT_CERT = fs.readFileSync('./test/keys/client-cert.pem'),
    UNKNOWN_SERVER_KEY = fs.readFileSync('./test/keys/unknown-server-key.pem'),
    UNKNOWN_SERVER_CERT = fs.readFileSync('./test/keys/unknown-server-cert.pem'),
    UNKNOWN_CLIENT_KEY = fs.readFileSync('./test/keys/unknown-client-key.pem'),
    UNKNOWN_CLIENT_CERT = fs.readFileSync('./test/keys/unknown-client-cert.pem');

describe('Client', function() {
  it('should timeout if the server does not respond to an open request after the 2 seconds by default', function(done) {
    this.timeout(3000);
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
        tunnel: {
          host: HOST,
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT,
          ca: [SERVER_CERT]
        },
        target: {
          host: TARGET_HOST,
          port: TARGET_PORT
        } 
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
        server.close(function() {
          checklist.check('closed');
        });
      });
    });
  });

  it('should timeout if the server does not respond to an open request after the configured time', function(done) {
    this.timeout(1000);
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
        tunnel: {
          host: HOST,
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT,
          ca: [SERVER_CERT]
        },
        target: {
          host: TARGET_HOST,
          port: TARGET_PORT
        },
        timeout: 500
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
        server.close(function() {
          checklist.check('closed');
        });
      });
    });
  });

  describe('with a mock server', function() {
    var server = tls.createServer({
      key: SERVER_KEY,
      cert: SERVER_CERT,
      requestCert: true,
      rejectUnauthorized: true,
      ca: [CLIENT_CERT]
    });

    var singleTlsTunnelServer = new SingleTlsTunnelServer({
      key: SERVER_KEY,
      cert: SERVER_CERT,
      ca: [CLIENT_CERT], 
      requestCert: true,
      rejectUnauthorized: true  
    });

    before(function(done) {
      server.listen(PORT, function() {
        singleTlsTunnelServer.listen(FORWARDED_PORT, done);
      });
    });

    it('should connect to the server, send the open request and connect to the subsequently started single-tls-tunnel instance', function(done) {
      var checklist = new Checklist([
        'connected', 
        'open', 
        'connected', 
        null, 
        FORWARDED_PORT, 
        'disconnected'
      ], function(error) {
        server.removeAllListeners('secureConnection');
        singleTlsTunnelServer.removeAllListeners('connected');
        done(error);
      });
      server.on('secureConnection', function(connection) {
        checklist.check('connected');
        connection.setEncoding('utf8');
        connection.on('data', function(data) {
          checklist.check(data);
          connection.write('open:success:' + FORWARDED_PORT);
        });
      });
      var client = new Client({
        tunnel: {
          host: HOST,
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT,
          ca: [SERVER_CERT]
        },
        target: {
          host: TARGET_HOST,
          port: TARGET_PORT
        },
        timeout: 5000
      });
      singleTlsTunnelServer.on('connected', function() {
        checklist.check('connected');
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
      var checklist = new Checklist([
        (new Error('Server rejected connection: No ports available')).toString(),
        'undefined'
      ], function(error) {
        server.removeAllListeners('secureConnection');
        done(error);
      });
      server.on('secureConnection', function(connection) {
        connection.on('data', function(data) {
          connection.end('open:error:No ports available');
        });
      });
      var client = new Client({
        tunnel: {
          host: HOST,
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT,
          ca: [SERVER_CERT]
        },
        target: {
          host: TARGET_HOST,
          port: TARGET_PORT
        },
        timeout: 5000
      });
      client.connect(function(error, port) {
        checklist.check(error.toString());
        checklist.check(typeof port);
      });
    });

    describe('and connected', function() {
      var target = net.createServer();
      var client = new Client({
        tunnel: {
          host: HOST,
          port: PORT,
          key: CLIENT_KEY,
          cert: CLIENT_CERT,
          ca: [SERVER_CERT]
        },
        target: {
          host: TARGET_HOST,
          port: TARGET_PORT
        },
        timeout: 5000
      });

      before(function(done) {
        server.on('secureConnection', function(connection) {
          connection.on('data', function(data) {
            connection.write('open:success:' + FORWARDED_PORT);
          });
        });
        target.listen(TARGET_PORT, function() {
          client.connect(done);
        });
      });

      it('should tunnel to the target server', function(done) {
        var checklist = new Checklist([
          'upstream connected',
          'downstream connected',
          'Some forwarded traffic',
          'A forwarded response',
          'end'
        ], function(error) {
          target.removeAllListeners('connection');
          done(error);
        });
        target.on('connection', function(connection) {
          checklist.check('downstream connected');
          connection.setEncoding('utf8');
          connection.on('data', function(data) {
            checklist.check(data);
            connection.end('A forwarded response');
          });
        });
        var connection = net.connect(FORWARDED_PORT, function() {
          checklist.check('upstream connected');
          connection.setEncoding('utf8');
          connection.on('data', function(data) {
            checklist.check(data);
          });
          connection.on('end', function() {
            checklist.check('end');
          });
          connection.write('Some forwarded traffic');
        });
      });

      after(function(done) {
        client.disconnect(function() {
          target.close(done);
        });
      });
    });

    after(function(done) {
      singleTlsTunnelServer.close(function() {
        server.close(done);
      });
    });
  });
});
