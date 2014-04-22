var setCallback = require('./fixtures/DogStatsD');
var Dogstatsy = require('..');

function createClient () {
  return new Dogstatsy({
    service: 'dogstatsy',
    port: 8126
  });
}

describe('dogstatsy', function () {

  it('should gauge', function (done) {
    var stat = 'gauge';
    var val = '42';
    setCallback(stat, '|g', function (err, stat, val, tags) {
      if (stat !== stat || val !== val) {
        done(new Error('mismatch'));
      } else {
        done();
      }
    });
    createClient().gauge(stat, val);
  });

});