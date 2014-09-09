var async = require('async');
var express = require('express');
var wrench = require('wrench');

var Db = require('./services/db.js');
var Log = require('./services/log.js');

function Manager (server, pkg) {
  this.server = server;
  this.pkg = pkg;
}

Manager.prototype.acceptedMethods = ['get', 'post', 'put', 'delete', 'head'];

Manager.prototype.apps = [];

Manager.prototype.appNames = [];

Manager.prototype.status = 'INIT';

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
      async.each(app.routes, function (r, callback) {
        var method = r.method.toLowerCase();
        if (self.acceptedMethods.indexOf(method) < 0)
          return callback(new Error('Invalid HTTP method in routes.'));
        router[method](r.url, function (req, res) {
          r.handler(req, res, services);
        });
      }, function (err) {
        callback(err);
      });
    },
    function (callback) {
      if (app.static)
        wrench.copyDirRecursive('../node_modules/' + name + '/' + app.static, '../dist' + app.path, {forceDelete: true}, function (err) {
          return callback(err);
        });
    },
    function (callback) {
      if (app.init)
        app.init(services, function (err) {
          return callback(err);
        });
    }
  ], function (err) {
    app.position = self.server.stack.length;
    if (app.path === '/')
      self.server.use(router);
    else
      self.server.use(app.path, router);
    self.apps.push(app);
    if (self.status === 'WORKING') {
      // After init, the last two middlewares in the stack are 404 and 500
      // handlers. New routers need to be placed in front of them.
      var r = self.server.stack.splice(app.position, 1);
      self.server.stack.splice(app.position - 2, 1, r[0]);
      app.position = app.position - 2;
    }
    return callback(err);
  });
};

Manager.prototype.unload = function (name, callback) {
  var self = this;
  for (i = 0; i < self.apps.length; i++) {
    if (name === self.apps[i].name)
      break;
  }
  if (i >= self.apps.length)
    return callback(new Error('The specified application is not loaded.'));
  var app = self.apps[i]
  async.parallel([
    function (callback) {
      self.server.stack.splice(app.position, 1);
      return callback();
    },
    function (callback) {
      wrench.rmdirRecursive('../dist' + app.path, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    var i = self.appNames.indexOf(name);
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
  async.each(apps, self.load, function (err) {
    self.status = 'WORKING';
    return callback(err);
  });
};

module.exports = Manager;
