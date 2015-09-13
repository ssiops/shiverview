var async = require('async');
var q = require('q');

var LegacyDb = require('./db-legacy.js');

function Db (opt) {
  var self = this;
  var credentials = '';
  self.params = require('../../config.json').db;
  if (typeof opt === 'string') {
    self.params.db = opt;
  } else if (typeof opt === 'object') {
    if (opt.legacy)
      return new LegacyDb();
    for (var prop in opt) {
      self.params[prop] = opt[prop];
    }
  }
  if (self.params.username.length > 0)
    credentials = self.params.username + ':' + self.params.password + '@';
  self.mongodb = require('mongodb');
  self.mongourl = 'mongodb://' + credentials + self.params.hostname + ':' + self.params.port + '/' + self.params.db;
  self.client = self.mongodb.MongoClient;
  self.util = {
    ObjectID: require('mongodb').ObjectID
  };
  self.conn = [];
  setInterval(function () {
    self.recycle();
  }, 3000);
  return self;
}

Db.prototype.connect = function (callback) {
  var self = this;
  if (self.conn.length < 1) {
    self.client.connect(self.mongourl, function (err, db) {
      return callback(err, db);
    });
  } else {
    return callback(undefined, self.conn.shift());
  }
};

Db.prototype.recycle = function () {
  var self = this;
  if (self.conn.length > 3) {
    var recycle = self.conn.splice(0, parseInt(self.conn.length / 2));
    async.each(recycle, function (item, callback) {
      item.close();
    }, function (err) {
      console.log(err);
    })
  }
}

Db.prototype.insert = function (data, coll, options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).insert(data, options, function (err, data) {
      self.conn.push(db);
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.remove = function (query, coll, options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).remove(query, options, function (err, data) {
      self.conn.push(db);
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.update = function (query, data, coll, options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).update(query, data, options, function (err, data) {
      self.conn.push(db);
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.find = function (query, coll, options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    var cursor = db.collection(coll).find(query, options)
    if (options.range instanceof Array) {
      if (options.range[0] > 0)
        cursor.skip(options.range[0]);
      if (options.range[1] > options.range[0])
        cursor.limit(options.range[1] - options.range[0]);
    }
    cursor.toArray(function (err, data) {
      self.conn.push(db);
      if (err) return d.reject(err.message);
      d.resolve(data);
    });
  });
  return d.promise;
};

Db.prototype.aggregate = function (aggregation, coll, options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
    if (err) return d.reject(err.message);
    if (typeof db === 'undefined') d.reject('Cannot connect to ' + self.mongourl);
    db.collection(coll).aggregate(aggregation, options, function (err, result) {
      self.conn.push(db);
      if (err) return d.reject(err.message);
      d.resolve(result);
    });
  });
  return d.promise;
};

Db.prototype.index = function (options) {
  var self = this;
  var d = q.defer();
  self.connect(function (err, db) {
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
        callback(err);
      });
    }, function (err) {
      self.conn.push(db);
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
