var async = require('async');
var express = require('express');
var mkdirp = require('mkdirp');
var wrench = require('wrench');

var Db = require('./services/db.js');
var Log = require('./services/log.js');

function Manager (server, pkg) {
  this.acceptedMethods = ['get', 'post', 'put', 'delete', 'head'];
  this.apps = {};
  this.appNames = [];
  this.status = 'INIT';
  this.server = server;
  this.pkg = pkg;
}

Manager.prototype.load = function (name, callback) {
  var self = this;
  if (self.appNames.indexOf(name) >= 0)
    return callback(new Error('This application is already loaded.'));
  else
    self.appNames.push(name);
  var app = require(name);
  var router = express.Router();
  var services = {};
  if (app.privileges.database)
    services.db = new Db(app.privileges.database);
  if (app.privileges.manager)
    services.manager = self;
  if (app.privileges.log)
    services.log = Log;
  async.parallel([
    function (callback) {
      if (process.env.verbose) console.log('Init ' + name + ' routes');
      async.each(app.routes, function (r, callback) {
        var method = r.method.toLowerCase();
        if (self.acceptedMethods.indexOf(method) < 0)
          return callback(new Error('Invalid HTTP method in routes.'));
        router[method](r.url, function (req, res) {
          r.handler(req, res, services);
        });
        return callback();
      }, function (err) {
        if (process.env.verbose) console.log('Init ' + name + ' routes complete.');
        callback(err);
      });
    },
    function (callback) {
      if (app.static) {
        if (process.env.verbose) console.log('Init ' + name + ' static files');
        var left = './node_modules/' + name + '/' + app.static;
        var right = './static' + app.path;
        mkdirp.sync(right);
        console.log('Copying %s to %s', left, right);
        wrench.copyDirSyncRecursive(left, right, {forceDelete: false});
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
      self.server._router.stack.splice(app.position - 2, 1, r[0]);
      app.position = app.position - 2;
      app.finally(function (err) {
        return callback(err, app);
      });
    } else
      return callback(err, app);
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
      return callback();
    },
    function (callback) {
      wrench.rmdirRecursive('./static' + app.path, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    var i = self.appNames.indexOf(name);
    delete self.apps[name];
    self.appNames.splice(i, 1);
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
  async.map(apps, function (item, callback) {
    self.load(item, callback);
  }, function (err, results) {
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
      return callback(err);
    });
  });
};

module.exports = Manager;
