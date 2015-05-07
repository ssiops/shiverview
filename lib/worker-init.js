var async = require('async');
var net = require('net');
var util = require('util');

var config = require('../config.json');
var pkg = require('../package.json');
var payload = {
  argv: process.argv,
  pkg: pkg,
  config: config
};

module.exports = function () {
  if (typeof config.clusters === 'undefined') {
    console.log('No worker servers have been configured.')
  } else if (config.clusters instanceof Array) {
    async.each(config.clusters, function (item, callback) {
      var uri = item.split(':');
      var conn = net.createConnection({
        host: uri[0],
        port: uri.length > 1 ? uri[1]: 1337
      });
      conn.write(JSON.stringify(payload));
      conn.on('data', function (data) {
        if (data.toString() == 'ok')
          conn.end();
      })
    }, function (err) {

    });
  }
};
