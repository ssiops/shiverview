'use strict';

var t = new Date();
var pkg = require('./package.json');
var init = require('./lib/init.js');

var assert = require('assert');
var http = require('http');
var https = require('https');
var fs = require('fs');
var cluster = require('cluster');

var async = require('async');
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

var redisClient = redis.createClient();
var RedisStore = require('connect-redis')(session);

var Manager = require('./lib/manager.js');
var error = require('./lib/errHandler.js');

if (process.env.verbose) console.log('[%s]\nSystem started. Initializing system clusters.', t);

init();

var server = module.exports = process.server = express();

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
server.use(serveStatic(__dirname + '/static'));
server.use('/usercontent', serveStatic(__dirname + '/usercontent'));
server.use(methodOverride());
server.use(errorHandler({ dumpExceptions: true, showStack: true }));
server.set('view engine', 'html');
server.set('views', __dirname + '/views');
server.engine('html', require('hbs').__express);

var man = new Manager(server, pkg);

man.init(function(err) {
  if (err) console.log(err);
  server.emit('ready');
  server.use(error.s404);
  server.use(error.s500);
  if (cluster.isMaster) {
    if (process.env.single) {
      http.createServer(process.server).listen(process.env.port || 80, function () {
        console.log("HTTP server booted in %d ms on port 80.", new Date().getTime() - t.getTime());
      });
    } else {
      // Fork workers.
      for (var i = 0; i < require('os').cpus().length; i++) {
        cluster.fork();
      }
      cluster.on('exit', function(worker, code, signal) {
        if (process.env.verbose) console.log('Worker ' + worker.process.pid + ' died.');
        cluster.fork();
      });
    }
  } else {
    if (cluster.worker.id === 0 || typeof ssl === 'undefined')
      http.createServer(process.server).listen(process.env.port || 80, function () {
        console.log("HTTP server cluster #%d@%d booted in %d ms on port 80.", cluster.worker.id, cluster.worker.process.pid, new Date().getTime() - t.getTime());
      });
    if (typeof ssl !== 'undefined') {
      https.createServer(ssl, process.server).listen(process.env.sslport || 443, function () {
        console.log("HTTPS server cluster #%d@%d booted in %d ms on port 443.", cluster.worker.id, cluster.worker.process.pid, new Date().getTime() - t.getTime());
      });
    }
  }

});
