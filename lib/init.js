module.exports = function () {
  for (var i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '-d' && typeof process.argv[i+1] !== 'undefined') {
      process.chdir(process.argv[i+1])
    } else if (process.argv[i] === '-v' || process.argv[i] === '--verbose') {
      process.env.verbose = true;
    } else if (process.argv[i] === '-t' || process.argv[i] === '--test') {
      process.env.test = true;
    } else if (process.argv[i] === '-1' || process.argv[i] === '--single') {
      process.env.single = true;
    } else if (process.argv[i] === '--port' && process.argv[i+1] !== 'undefined') {
      process.env.port = parseInt(process.argv[i+1]);
    } else if (process.argv[i] === '--ssl-port' && process.argv[i+1] !== 'undefined') {
      process.env.sslport = parseInt(process.argv[i+1]);
    }
  }
}
