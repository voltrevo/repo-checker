#!/usr/bin/env node

'use strict';

var argv = require('minimist')(process.argv.slice(2));
var defaultConfig = require('./defaultConfig.js');
var run = require('./index.js');

if (argv._.length !== 1) {
  throw new Error('Expected exactly one positional argument');
}

var repoStr = argv._[0];
var config = argv.c || argv.config || defaultConfig;

var logger = (
  argv.v || argv.verbose ?
  function(logStr) { console.log(logStr); } :
  function() {}
);

run(
  repoStr,
  config,
  logger
).then(function(result) {
  console.log(result);
}).catch(function(err) {
  process.nextTick(function() {
    throw err;
  });
});
