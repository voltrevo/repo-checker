'use strict';

var logWrap = require('./logWrap.js');

var exec = logWrap('exec', require('child-process-promise').exec);
var fs = require('fs');
var tmpDir = logWrap('tmpDir', require('./tmpDir.js'));

var debugExec = function(cmd) {
  return exec(cmd).then(function(result) {
    console.log('  stdout:', result.stdout);
    console.log('  stderr:', result.stderr);

    return result;
  });
};

module.exports = function(repoStr) {
  return tmpDir().then(function(dir) {
    var workDir = dir.path;
    console.log(workDir);
    process.chdir(workDir);

    var cmds = [
      'git clone ' + repoStr,
      function() {
        return new Promise(function(resolve, reject) {
          fs.readdir('.', function(err, files) {
            if (err) {
              reject(err);
              return;
            }

            resolve(process.chdir(files[0]));
          });
        });
      },
      'pwd',
      'ls',

      // If package.json didn't exist, this empty one will cause `npm install` to fail immediately
      // instead of looking through parent directories.
      'touch package.json',

      'npm install',
      function() {
        return new Promise(function(resolve, reject) {
          fs.stat('./eslintrc', function(err) {
            if (!err) {
              resolve();
              return;
            }

            fs.writeFile(
              '.eslintrc',
              JSON.stringify({
                'extends': 'eslint-config-opentok'
              }),
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });
      },
      'npm install eslint eslint-config-opentok',
      './node_modules/.bin/eslint $(git ls-files | grep \\.js$)'
    ];

    var loop = (function() {
      var i = 0;

      return function(x) {
        if (i === cmds.length) {
          return x;
        }

        var cmd = cmds[i++];

        if (typeof cmd === 'function') {
          return cmd().then(loop);
        }

        return debugExec(cmd).then(loop);
      };
    }());

    return loop();
  });
};
