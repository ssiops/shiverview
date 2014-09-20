var util = require('util');

var Log = require('./services/log.js');

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

  var log = new Log(req, util.inspect(err), '500');
  log.store();

  if (req.accepts('html', 'json') === 'json') {
    if (err && err.message)
      res.send(err);
    else
      res.send({message: 'An error has ocurred. Please try again later.'});
    return;
  } else {
    res.render('500.hbs', { path: req.originalUrl, error: util.inspect(err) });
    return;
  }
}
