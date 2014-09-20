var Db = require('./db.js');
var db = new Db();

var util = require('util');

function Log(req, msg, tag) {
  if (typeof req !== 'undefined') {
    this.url = req.protocol + '://' + req.get('Host') + req.originalUrl;
    this.ip = req.ip;
    this.ua = req.get('User-Agent');
    this.lang = req.get('Accept-Language').split(',');
    this.cookie = util.inspect(req.cookies);
    if (req.session.user)
      this.user = req.session.user.name;
  }
  this.date = new Date();
  this.msg = msg;
  if (typeof tag === 'string')
    this.tag = tag.split(' ');
  else
    this.tag = tag;
  return this;
}

Log.prototype.store = function() {
  var _this = this;
  db.insert(_this, 'logs', {})
  .then(undefined, function (err) {
    console.log(err);
  });
};

module.exports = Log;
