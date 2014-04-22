var dgram = require('dgram');
var debug = require('debug')('dogstatd');
var sock = dgram.createSocket('udp4');

sock.bind(8126);

sock.on('message', function(msg){
  debug('statsd: %j', msg.toString());
});

module.exports = setCallback;

function setCallback (stat, postFix, cb) {
  var statExp = new RegExp('^' + stat + ':');
  var postFixExp = new RegExp(postFix);
  sock.on('message', checkCallback);

  function checkCallback (msg) {
    if (statExp.test(msg) && postFixExp.test(msg)) {
      var val = /^[^:]+:([^|]+)|/.exec(msg)[1];
      var tagArray = /\|#(.*)/.exec(msg)[1].split(',');
      var tags = {};
      tagArray.forEach(function (tag) {
        tags[tag.split(/:/)[0]] = tag.split(/:/)[1];
      });
      cb(null, stat, val, tags);
      sock.removeListener('message', checkCallback);
    } 
  }
}