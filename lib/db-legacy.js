var assert = require('assert');
var async = require('async');

var params = {
  "hostname":"localhost",
  "port":27017,
  "username":"",
  "password":"",
  "name":"",
  "db":"starshard"
};

function Db (name) {
  var db = params.db;
  if (typeof name !== 'undefined') {
    db = 'shard_' + name;
  }
  this.mongodb = require('mongodb');
  this.mongourl = "mongodb://" + params.hostname + ":" + params.port + "/" + db;
  this.client = this.mongodb.MongoClient;
  this.util = {
    ObjectID: require('mongodb').ObjectID
  }
  return this;
}

Db.prototype.insert = function (data, coll, options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    db.collection(coll).insert(data, options, function (err, data) {
      if (err) {
        callback(err);
        return self;
      }
      db.close();
      callback(err, data)
      return self;
    });
  });
}

Db.prototype.remove = function (query, coll, options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    db.collection(coll).remove(query, options, function (err, data) {
      if (err) {
        callback(err);
        return self;
      }
      db.close();
      callback(null, data);
      return self;
    });
  });
}

Db.prototype.update = function (query, data, coll, options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    db.collection(coll).update(query, data, options, function (err, data) {
      if (err) {
        callback(err);
        return self;
      }
      db.close();
      callback(null, data);
      return self;
    });
  });
}

Db.prototype.find = function (query, coll, options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    db.collection(coll).find(query, options).toArray(function (err, docs) {
      if (err) {
        callback(err);
        return self;
      }
      db.close();
      callback(null, docs);
      return self;
    });
  });
}

Db.prototype.aggregate = function (aggregation, coll, options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    db.collection(coll).aggregate(aggregation, options, function (err, result) {
      if (err) {
        callback(err);
        return self;
      }
      db.close();
      callback(null, result);
      return self;
    });
  });
}

Db.prototype.index = function (options, callback) {
  var self = this;
  self.client.connect(self.mongourl, function (err, db) {
    if (err) {
      callback(err);
      return self;
    }
    if (typeof db === 'undefined') {
      console.log('Failed to establish Mongodb connection.');
      return self;
    }

    async.each(options, function (opt, callback) {
      if (typeof opt.coll === 'undefined')
        return {err: 'Collection is not defined.'};
      if (typeof opt.index === 'undefined')
        return {err: 'Index is not defined.'};
      var ind = {}
      if (typeof opt.type === 'undefined')
        ind[opt.index] = 1;
      else
        ind[opt.index] = opt.type;
      db.collection(opt.coll).ensureIndex(ind, opt.options, function (err, indexName) {
        return callback(err);
      });
    }, function (err) {
      callback(err);
      return self;
    });
  });
}

Db.prototype.init = function (callback) {
  var self = this;
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
  ], function (err) {
    callback(err);
    return self;
  });
}

module.exports = Db;