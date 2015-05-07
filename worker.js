var net = require('net');
var fs = require('fs');
var exec = require('child_process').exec;
var fork = require('child_process').fork;

for (var i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '-d' && typeof process.argv[i+1] !== 'undefined') {
    process.chdir(process.argv[i+1])
  } else if (process.argv[i] === '--port' && process.argv[i+1] !== 'undefined') {
    process.env.port = parseInt(process.argv[i+1]);
  }
}

var server = net.createServer(function (conn) {
  console.log('Master server connected.')
  conn.on('data', function (data) {
    var payload = JSON.parse(data.toString());
    fs.writeFileSync('./package.json', JSON.stringify(payload.pkg, null, 2));
    fs.writeFileSync('./config.json', JSON.stringify(payload.config, null, 2));
    conn.write('ok');
    console.log('Master configuration received, running npm install.')
    exec('npm install', function (err, stdout, stderr) {
      if (err) console.log(stderr);
      else console.log(stdout);
      for (var i = 1; i < payload.argv.length; i++) {
        if (payload.argv[i] === '-M' || payload.argv[i] === '--master')
          delete payload.argv[i];
      }
      console.log('Starting server.\nnode server', payload.argv.slice(2).join(' '));
      fork('./server.js', payload.argv.slice(2));
    });
  });
  conn.on('end', function () {
    console.log('Master server disconnected.')
  });
});

server.listen(process.env.port || 1337, function () {
  console.log('Waiting for master server on port %d.', process.env.port || 1337);
});
