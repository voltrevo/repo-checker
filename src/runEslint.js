'use strict';

var spawn = require('child_process').spawn;

module.exports = function(filenames) {
  var stdout = '';
  var stderr = '';

  return new Promise(function(resolve, reject) {
    var eslint = spawn('./node_modules/.bin/eslint', filenames);

    eslint.stdout.on('data', function(data) {
      stdout += data.toString();
    });

    eslint.stderr.on('data', function(data) {
      stderr += data.toString();
    });

    var stdoutFinished = false;
    var stderrFinished = false;

    var tryEnd = function() {
      if (stdoutFinished && stderrFinished) {
        if (stderr.length > 0) {
          reject({
            stdout: stdout,
            stderr: stderr
          });
        } else {
          resolve(stdout);
        }
      }
    };

    eslint.stdout.on('end', function() {
      stdoutFinished = true;
      tryEnd();
    });

    eslint.stderr.on('end', function() {
      stderrFinished = true;
      tryEnd();
    });
  });
};
