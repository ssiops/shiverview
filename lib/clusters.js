var cluster = require('cluster');

var handlerFactory = function (id, man) {
  return function (msg) {
    if (msg.load) {
      if (process.env.verbose) console.log('Master is loading %s.', msg.load);
      man.load(msg.load, function (err) {
        if (process.env.verbose) console.log('Master finished loading %s.', msg.load);
        if (err) console.log(err);
      });
    }
    if (msg.unload) {
      if (process.env.verbose) console.log('Master is unloading %s.', msg.unload);
      man.unload(msg.unload, function (err) {
        if (process.env.verbose) console.log('Master finished unloading %s.', msg.unload);
        if (err) console.log(err);
      });
    }
    for (var i in cluster.workers) {
      if (i != id)
        cluster.workers[i].send(msg);
    }
  }
}

module.exports = {
  fork: function (server) {
    if (cluster.isMaster) {
      for (var i = 0; i < require('os').cpus().length; i++) {
        cluster.fork();
      }
      cluster.on('exit', function(worker, code, signal) {
        if (process.env.verbose) console.log('Worker ' + worker.process.pid + ' died.');
        cluster.fork();
      });
      for (var id in cluster.workers)
        cluster.workers[id].on('message', handlerFactory(id, server.manager));
    }
  }
};
