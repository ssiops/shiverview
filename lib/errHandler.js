var util = require('util');

var Log = require('./services/log.js');
var Err = require('./services/err.js');

module.exports.s404 = function(req, res, next) {
  res.status(404);

  var log = new Log(req, req.originalUrl, '404');
  log.store();

  if (req.accepts('html', 'json') === 'json') {
    res.send({ message: 'Requested resource is not found.' });
    return;
  } else {
    res.render('404.hbs', { path: req.originalUrl });
    return;
  }
}

module.exports.s500 = function(err, req, res, next){
  res.status(err.status || 500);

  var error = new Err(err, {req: req, tag: '500', store: true, storeStack: true});

  if (req.accepts('html', 'json') === 'json') {
    res.send({message: error.message});
  } else {
    res.render('500.hbs', { path: req.originalUrl, error: error.message });
    return;
  }
}
