'use strict';

var t = new Date();
var pkg = require('../package.json');
var config = require('../config.json');

var assert = require('assert');
var cluster = require('cluster');
var http = require('http');
var fs = require('fs');

var q = require('q');
var express = require('express');
var redis = require('redis');

var hbs = require('hbs');
var logger = require('morgan');
var compress = require('compression');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var serveStatic = require('serve-static');
var methodOverride = require('method-override');
var connectRedis = require('connect-redis');
var multiparty = require('connect-multiparty');
var errorHandler = require('errorhandler');

var redisClient = redis.createClient(config.cache.port || 6379, config.cache.host || '127.0.0.1');
var RedisStore = require('connect-redis')(session);

var Manager = require('./manager.js');
var error = require('./errHandler.js');
var Test = require('./tests.js');

if (process.env.master) {
  var workerInit = require('./worker-init.js');
  workerInit();
}

var d = q.defer();
module.exports = d.promise;

if (cluster.isMaster) console.log('[%s]\nSystem started. Initializing system clusters.', t);
if (cluster.isWorker) console.log('Worker #%d @%s initializing.', cluster.worker.id, cluster.worker.process.pid)

// Server middlewares
var server = express();
server.locals.version = pkg.version;
if (pkg.production === true) {
  server.set('env', 'production');
} else {
  server.set('env', 'development');
  server.use(logger('dev'));
}
server.use(compress());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));
server.use(multiparty({limit: '8MB'}));
server.use(cookieParser());
server.use(session({
  store: new RedisStore({client: redisClient}),
  secret: 'shiverview',
  saveUninitialized: true,
  resave: true
}));
server.use(serveStatic(process.cwd() + '/static'));
server.use('/usercontent', serveStatic(process.cwd() + '/usercontent'));
server.use(methodOverride());
server.use(errorHandler({ dumpExceptions: true, showStack: true }));
server.set('view engine', 'html');
server.set('views', process.cwd() + '/views');
server.engine('html', require('hbs').__express);

// Manager init
var man = new Manager(server, pkg);
man.init(function(err) {
  if (err) d.reject(err);
  server.manager = man;
  server.emit('ready');
  server.use(error.s404);
  server.use(error.s500);

  // Server methods
  server.listen = function (port) {
    http.createServer(server).listen(process.env.port || 80, function () {
      console.log('HTTP server booted in %d ms on port %d.', new Date().getTime() - t.getTime(), process.env.port || 80);
    });
  }

  server.test = function () {
    var test = new Test(man);
    test.execute()
    .then(function (result) {
      console.log('\nTest completed. %d out of %d routes tested.', result.tested.length, result.total.length);
      process.exit(0);
    }, function (result) {
      console.log('\nTest completed with failures. %d out of %d routes tested, %d failed.', result.tested.length, result.total.length, result.failed.length);
      process.exit(1);
    });
  }

  d.resolve(server);
});
