var q = require('q');
var async = require('async');
var chalk = require('chalk');

var Db = require('./services/db.js');
var It = function (url) {
  return function (should, callback) {
    if (process.env.verbose) console.log('%s %s', url, should);
    callback(Db);
  };
};

function Test (manager) {
  this.manager = manager;
  this.total = [];
  this.tested = [];
  this.failed = [];
  return this;
}

Test.prototype.test = function (url, test) {
  var d = q.defer();
  // TODO: finish test function
  if (typeof test !== 'function')
    d.reject();
  if (process.env.verbose) console.log(chalk.underline('Executing test for %s.'), url);
  test(It(url)).then(function () {
    if (process.env.verbose) console.log(chalk.green('Test for %s completed.\n'), url);
    d.resolve();
  }, function (err) {
    console.log('Test for %s failed.\n', url);
    if (err) console.log(err);
    d.reject();
  });
  return d.promise;
};

Test.prototype.execute = function () {
  var d = q.defer();
  var self = this;
  var date = new Date();
  console.log(chalk.underline('\nExecuting tests for all routes.\n') + '[%s]\n', date);
  async.concatSeries(self.manager.appNames, function (name, callback) {
    var app = self.manager.apps[name];
    if (typeof app.routes === 'undefined')
      return callback();
    async.concatSeries(app.routes, function (route, callback) {
      var url = app.path + route.url;
      if (app.path === '/')
        url = route.url;
      self.total.push(url);
      if (typeof app.tests === 'undefined' || typeof app.tests[route.url] === 'undefined') {
        if (process.env.verbose) console.log(chalk.yellow('Tests for %s not found. Skipping.'), url);
        return callback();
      }
      self.test(url, app.tests[route.url])
      .then(function (url) {
        self.tested.push(url);
        return callback();
      }, function (url) {
        self.tested.push(url);
        self.failed.push(url);
        return callback(null, url);
      });
    }, function (err, fails) {
      return callback(err, fails);
    });
  }, function (err, fails) {
    if (err || fails.length > 0)
      d.reject(self);
    else
      d.resolve(self);
  });
  return d.promise;
};

module.exports = Test;
