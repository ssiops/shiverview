var Log = require('./log.js');

function Err (message, opt) {
  var e = new Error();
  this.message = message;
  if (typeof message === 'undefined')
    this.message = 'An error has ocurred.';
  else if (typeof message.message !== 'undefined') {
    this.message = message.message;
  }
  if (typeof opt !== 'undefined') {
    if (typeof opt.store !== 'undefined' && typeof opt.req !== 'undefined') {
      var log = new Log(opt.req, this.message, opt.tag);
      if (opt.storeStack)
        log.stack = e.stack;
      log.store();
    }
    if (typeof opt.stack !== 'undefined') {
      this.stack = e.stack;
      if (typeof message !== 'undefined' && typeof message.stack !== 'undefined')
        this.stack = e.stack;
    }
  }
  return this;
};

module.exports = Err;
