'use strict';

//var test = require('test');
var test = function(fn) {
  //fn();
};

var logWrap = function(name, fn, loggerParam) {
  var logger = loggerParam || function() {
    return console.log.apply(console, arguments);
  };

  var withNameLogger = function() {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(name + '(');
    args.push(')');

    logger.apply(undefined, args);
  };

  return function() {
    withNameLogger.apply(undefined, arguments);
    return fn.apply(this, arguments);
  };
};

module.exports = logWrap;

test(function() {
  var assert = require('assert');

  var add3 = function(a, b, c) {
    return a + b + c;
  };

  var recorder = (function() {
    var api = {};
    api.calls = [];

    api.record = function() {
      api.calls.push({ 'this': this, arguments: Array.prototype.slice.apply(arguments) });
    };

    return api;
  })();

  var add3WithLogging = logWrap('add3', add3, recorder.record);

  var callResult = add3WithLogging(1, 2, 3);

  assert.equal(callResult, 6);

  assert.deepEqual(
    recorder.calls,
    [{ 'this': undefined, arguments: ['add3(', 1, 2, 3, ')'] }]
  );
});
