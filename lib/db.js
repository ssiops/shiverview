var async = require('async');
var q = require('q');

var LegacyDb = require('./db-legacy.js');

function Db (opt) {
  var credentials = '';
  if (typeof opt === 'string') {
    this.params.db = opt;
  } else if (typeof opt === 'object') {
    if (opt.legacy)
      return new LegacyDb();
    for (var prop in opt) {
      this.params[prop] = opt[prop];
    }
  }
  if (this.params.username.length > 0)
    credentials = this.params.username + ':' + this.params.password + '@';
  this.mongodb = require('mongodb');
  this.mongourl = 'mongodb://' + userpass + this.params.hostname + ':' + this.params.port + '/' + this.params.db;
  this.client = this.mongodb.MongoClient;
  this.util = {
    ObjectID: require('mongodb').ObjectID
  };
  return this;
}

Db.prototype.params = {
  'hostname':'localhost',
  'port':27017,
  'username':'',
  'password':'',
  'name':'',
  'db':'shiverview'
};

Db.prototype.insert = function (data, coll, options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).insert(data, options, function (err, data) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.remove = function (query, coll, options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).remove(query, options, function (err, data) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.update = function (query, data, coll, options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).update(query, data, options, function (err, data) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.find = function (query, coll, options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).find(query, options).toArray(function (err, data) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.aggregate = function (aggregation, coll, options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).aggregate(aggregation, options, function (err, result) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve(result);
    });
  });
  return d.promise;
};

Db.prototype.index = function (options) {
  var self = this;
  var d = q.defer();
  self.client.connect(self.mongourl, function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    async.each(options, function (opt, callback) {
      if (typeof opt.coll === 'undefined')
        return d.reject('Collection is not defined.');
      if (typeof opt.index === 'undefined')
        return d.reject('Index is not defined.');
      var ind = {};
      if (typeof opt.type === 'undefined')
        ind[opt.index] = 1;
      else
        ind[opt.index] = opt.type;
      db.collection(opt.coll).ensureIndex(ind, opt.options, function (err, indexName) {
        if (err) return d.reject(err.message);
      });
    }, function (err) {
      db.close();
      if (err) return d.reject(err.message);
      d.resolve();
    });
  });
  return d.promise;
};

Db.prototype.init = function () {
  var self = this;
  var d = q.defer();
  this.index([
    {
      coll: 'users',
      index: 'name',
      options: {unique: true}
    },
    {
      coll: 'logs',
      index: 'date',
      options: {expireAfterSeconds: 2764800}
    }
  ]).then(function (err) {
    if (err) return d.reject(err.message);
    d.resolve();
  });
  return d.promise;
};

module.exports = Db;