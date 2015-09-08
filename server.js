'use strict';

// Parse args
require('./lib/init.js')();
var cluster = require('cluster');

require('./lib/server.js').then(function (server) {
  if (process.env.single || cluster.isWorker)
    server.listen(process.env.port || 80);
  else
    require('./lib/clusters.js').fork(server);
  if (process.env.test && cluster.isMaster)
    server.test();
}, function (err) {
  console.log(err);
  process.exit(1);
});
