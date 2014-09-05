module.exports = function () {
  for (var i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '-d' && typeof process.argv[i+1] !== 'undefined') {
      process.chdir(process.argv[i+1])
    } else if (process.argv[i] === '-v' || process.argv[i] === '--verbose') {
      process.env.verbose = true;
    } else if (process.argv[i] === '-t' || process.argv[i] === '--test') {
      process.env.test = true;
    }
  }
}
