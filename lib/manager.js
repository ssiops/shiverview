var async = require('async');
var cluster = require('cluster');
var events = require('events');
var express = require('express');
var mkdirp = require('mkdirp');
var fse = require('fs-extra');
var util = require('util');

var Db = require('./services/db.js');
var Log = require('./services/log.js');
var Err = require('./services/err.js');

function Manager (server, pkg) {
  this.acceptedMethods = ['get', 'post', 'put', 'delete', 'head'];
  this.apps = {};
  this.appNames = [];
  this.status = 'INIT';
  this.server = server;
  this.pkg = pkg;
  this.config = require('../config.json');
}

util.inherits(Manager, events.EventEmitter);

Manager.prototype.load = function (name, callback) {
  var self = this;
  if (self.appNames.indexOf(name) >= 0)
    return callback(new Error('This application is already loaded.'));
  else
    self.appNames.push(name);
  var app = require(name);
  var router = express.Router();
  var services = {};
  var deps = [];
  for (var dep in app.dependencies) {
    if (typeof self.pkg.dependencies[dep] === 'undefined')
      deps.push(dep);
  }
  if (deps.length > 0)
    return callback(new Error('Package ' + name + ' needs additional dependencies: ' + deps.join(' ')));
  if (app.privileges.database)
    services.db = new Db(app.privileges.database);
  if (app.privileges.manager)
    services.manager = self;
  if (app.privileges.log)
    services.log = Log;
  if (app.privileges.err)
    services.err = Err;
  if (self.config[name])
    services.config = self.config[name];
  async.parallel([
    function (callback) {
      if (process.env.verbose) console.log('Init ' + name + ' routes');
      async.each(app.routes, function (r, callback) {
        var method = r.method.toLowerCase();
        if (self.acceptedMethods.indexOf(method) < 0)
          return callback(new Error('Invalid HTTP method in routes.'));
        router[method](r.url, function (req, res, next) {
          r.handler(req, res, services, next);
        });
        return callback();
      }, function (err) {
        if (process.env.verbose) console.log('Init ' + name + ' routes complete.');
        callback(err);
      });
    },
    function (callback) {
      if (app.static && cluster.isMaster) {
        if (process.env.verbose) console.log('Init ' + name + ' static files');
        var left = './node_modules/' + name + '/' + app.static;
        var right = './static' + app.path;
        mkdirp.sync(right);
        if (process.env.verbose) console.log('Copying %s to %s', left, right);
        fse.copySync(left, right);
        if (process.env.verbose) console.log('Init ' + name + ' static files complete.');
        return callback();
      } else return callback();
    },
    function (callback) {
      if (app.init) {
        if (process.env.verbose) console.log(name + ' self-init');
        app.init(services, function (err) {
          if (process.env.verbose) console.log(name + ' self-init complete.');
          return callback(err);
        });
      } else return callback();
    }
  ], function (err) {
    if (process.env.verbose) console.log('Registering ' + name);
    app.position = self.server._router.stack.length;
    if (app.path === '/')
      self.server.use(router);
    else
      self.server.use(app.path, router);
    self.apps[app.name] = app;
    if (self.status === 'WORKING') {
      // After init, the last two middlewares in the stack are 404 and 500
      // handlers. New routers need to be placed in front of them.
      var r = self.server._router.stack.splice(app.position, 1);
      self.server._router.stack.splice(app.position - 2, 0, r[0]);
      app.position = app.position - 2;
      if (typeof app.finally === 'function')
        app.finally(function (err) {
          self.emit('app-loaded', app.name);
          return callback(err, app);
        });
      else {
        self.emit('app-loaded', app.name);
        return callback(err, app);
      }
    } else {
      self.emit('app-loaded', app.name);
      return callback(err, app);
    }
  });
};

Manager.prototype.unload = function (name, callback) {
  var self = this;
  if (typeof self.apps[name] === 'undefined')
    return callback(new Error('The specified application is not loaded.'));
  var app = self.apps[name];
  async.parallel([
    function (callback) {
      self.server._router.stack.splice(app.position, 1);
      for (var a in self.apps) {
        if (self.apps[a].position > app.position)
          self.apps[a].position -= 1;
      }
      return callback();
    },
    function (callback) {
      if (cluster.isWorker || app.path === '/')
        return callback();
      fse.remove('./static' + app.path, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    var i = self.appNames.indexOf(name);
    delete self.apps[name];
    self.appNames.splice(i, 1);
    self.emit('app-unloaded', name);
    return callback(err);
  });
}

Manager.prototype.init = function (callback) {
  var self = this;
  self.server.apps = self.apps;
  var patt = /^shiverview-/;
  var apps = [];
  for (var dep in self.pkg.dependencies) {
    if (patt.test(dep))
      apps.push(dep);
  }
  if (cluster.isWorker) {
    process.on('message', function (msg) {
      if (msg.load) {
        self.load(msg.load, function (err) {
          if (process.env.verbose) console.log('Worker #%d finished loading %s.', cluster.worker.id, msg.load);
          if (err) console.log(err);
        });
      }
      if (msg.unload) {
        self.unload(msg.unload, function (err) {
          if (process.env.verbose) console.log('Worker #%d finished unloading %s.', cluster.worker.id, msg.unload);
          if (err) console.log(err);
        });
      }
    });
  }
  async.map(apps, function (item, callback) {
    self.load(item, callback);
  }, function (err, results) {
    if (err)
      return callback(err);
    self.status = 'WORKING';
    async.each(results, function (item, callback) {
      if (typeof item.finally === 'function') {
        if (process.env.verbose) console.log(item.name + ' running post-init script.');
        item.finally(function (err) {
          if (process.env.verbose) console.log(item.name + ' finished post-init script.');
          return callback(err);
        });
      } else
        return callback();
    }, function (err) {
      self.emit('init-done');
      return callback(err);
    });
  });
};

module.exports = Manager;
