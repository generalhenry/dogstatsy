
/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var debug = require('debug')('dogstatsy');
var fwd = require('forward-events');
var dgram = require('dgram');
var url = require('url');
var MersenneTwister = require('mersenne-twister');
var generator = new MersenneTwister();

/**
 * Expose `Client`.
 */

module.exports = Client;

/**
 * Initialize a new `Client` with `opts`.
 *
 * @param {Object} [opts]
 * @api public
 */

function Client(opts) {
  if (!(this instanceof Client)) return new Client(opts);
  opts = opts || {};
  this.sock = dgram.createSocket('udp4');
  this.host = opts.host || 'localhost';
  this.port = opts.port || 8125;
  this.tags = {
    'node_env': process.env.NODE_ENV,
    'service': opts.service
  };
  this.sample_rate = opts.sample_rate || 1;
  fwd(this.sock, this);
  this.on('error', this.onerror.bind(this));
}

/**
 * Inherit from `Emitter.prototype`.
 */

Client.prototype.__proto__ = Emitter.prototype;

/**
 * Noop errors.
 */

Client.prototype.onerror = function(err){
  debug('error %s', err.stack);
};

/**
 * Send `msg`.
 *
 * @param {String} msg
 * @api private
 */

Client.prototype.send = function(msg){
  debug('msg %s', msg);
  var buf = new Buffer(msg);
  this.sock.send(buf, 0, buf.length, this.port, this.host);
};

/**
 * Send with prefix when specified.
 *
 * @param {String} name
 * @param {String} val
 * @param {Object} tags
 * @api private
 */

Client.prototype.write = function(name, val, postfix, tags){
  debug('write %s', name);
  var msg = name + ':' + val + postfix;
  var tag, tagArray = [];
  if (this.sample_rate < 1) {
    if (generator.random() <= this.sample_rate) {
      msg = msg + '|@' + this.sample_rate;
    } else {
      return false;
    }
  }
  for (tag in this.tags) {
    tagArray.push(tag + ':' + this.tags[tag]);
  }
  if (tags) {
    for (tag in tags) {
      tagArray.push(tag + ':' + tags[tag]);
    }
  }
  this.send(msg + "|#" + tagArray.join(','));
};

/**
 * Send a gauge val.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.gauge = function(name, val, tags){
  debug('gauge %j %s %j', name, val, tags);
  this.write(name, val, '|g', tags);
};

/**
 * Send a set val.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.set = function(name, val, tags){
  debug('set %j %s %j', name, val, tags);
  this.write(name, val, '|s', tags);
};

/**
 * Send a meter val.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.meter = function(name, val, tags){
  debug('meter %j %s %j', name, val, tags);
  this.write(name, val, '|m', tags);
};

/**
 * Send a timer val or omit the val
 * to return a completion function.
 *
 * @param {String} name
 * @param {Number} [val]
 * @param {Object} [tags]
 * @return {Function}
 * @api public
 */

Client.prototype.timer = function(name, val, tags){
  var self = this;

  if (1 == arguments.length) {
    var start = new Date;
    return function(tags){
      self.timer(name, new Date - start, tags);
    }
  }

  debug('timer %j %s %j', name, val, tags);
  this.write(name, val, '|ms', tags);
};

/**
 * Send a histogram val or omit the val
 * to return a completion function.
 *
 * @param {String} name
 * @param {Number} [val]
 * @param {Object} [tags]
 * @return {Function}
 * @api public
 */

Client.prototype.histogram = function(name, val, tags){
  var self = this;

  if (1 == arguments.length) {
    var start = new Date;
    return function(tags){
      self.histogram(name, new Date - start, tags);
    }
  }

  debug('histogram %j %s %j', name, val, tags);
  this.write(name, val, '|h', tags);
};

/**
 * Send a counter val.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.count = function(name, val, tags){
  debug('count %j %s &j', name, val, tags);
  this.write(name, val, '|c', tags);
};

/**
 * Increment counter by `val` or 1.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.incr = function(name, val, tags){
  if (null == val) val = 1;
  this.count(name, val, tags);
};

/**
 * Decrement counter by `val` or 1.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.decr = function(name, val, tags){
  if (null == val) val = 1;
  this.count(name, -val, tags);
};

/**
 * Decrement counter by `val` or 1.
 *
 * @param {String} name
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

/**
 * Send counter vals.
 *
 * @param {Array} stats
 * @param {Number} val
 * @param {Object} tags
 * @api public
 */

Client.prototype.update_stats = function(stats, val, tags) {
    if (null == val) val = 1;

    for (var i = 0; i < stats.length; i++) {
      this.write(stats[i], delta, '|c', tags);
    }
};