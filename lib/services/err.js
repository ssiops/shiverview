var Log = require('./log.js');

function Err (message, opt) {
  var e = new Error();
  if (typeof message === 'undefined')
    this.message = 'An error has ocurred.';
  else if (typeof message.message !== 'undefined')
    this.message = message.message;
  else if (typeof message.msg !== 'undefined')
    this.message = message.msg;
  else if (typeof message === 'string')
    this.message = message;
  else
    this.message = require('util').inspect(message);
  if (typeof this.message.stack !== 'undefined')
    this.stack = this.message.stack;
  else
    this.stack = e.stack;
  if (typeof opt !== 'undefined') {
    if (typeof opt.store !== 'undefined' && typeof opt.req !== 'undefined') {
      var log = new Log(opt.req, this.message, opt.tag);
      if (opt.storeStack)
        log.stack = this.stack;
      log.store();
    }
  }
  return this;
};

module.exports = Err;
