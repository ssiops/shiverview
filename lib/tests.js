var q = require('q');
var async = require('async');

function Test (manager) {
  this.manager = manager;
  this.total = [];
  this.tested = [];
  this.failed = [];
  return this;
}

Test.prototype.test = function (app) {
  var d = q.defer();
  // TODO: finish test function
  return d.promise;
};

Test.prototype.execute = function () {
  var d = q.defer();
  var self = this;
  async.each(self.manager.appNames, function (name, callback) {
    var app = self.manager.apps[name];
    if (typeof app.routes === 'undefined')
      return callback();
    async.each(app.routes, function (route, callback) {
      var url = app.path + route.url;
      self.total.push(url);
      if (typeof app.tests === 'undefined' || typeof app.tests[route.url] === 'undefined')
        return callback();
      self.test(url, app.tests[route.url])
      .then(function (url) {
        self.tested.push(url);
        return callback();
      }, function (url) {
        self.tested.push(url);
        self.failed.push(url);
        return callback(1);
      });
    }, function (err) {
      return callback(err);
    });
  }, function (err) {
    if (err)
      d.reject();
    else
      d.resolve();
  });
  return d.promise;
};
