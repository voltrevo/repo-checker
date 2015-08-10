'use strict';

var logWrap = require('./logWrap.js');

var childProcessPromise = require('child-process-promise');
var exec = logWrap('exec', childProcessPromise.exec);
var runEslint = require('./runEslint.js');
var fs = require('fs');
var tmpDir = logWrap('tmpDir', require('./tmpDir.js'));

var once = function(fn) {
  return (function() {
    var called = false;
    var value;

    return function() {
      if (called) {
        return value;
      }

      called = true;

      value = fn.apply(this, arguments);
      return value;
    };
  })();
};

var chdirToOnlyDir = function() {
  return new Promise(function(resolve, reject) {
    fs.readdir('.', function(err, files) {
      if (err) {
        reject(err);
        return;
      }

      resolve(process.chdir(files[0]));
    });
  });
};

var createFileIfNeeded = function(fname, genContents) {
  return function() {
    return new Promise(function(resolve, reject) {
      fs.stat(fname, function(err) {
        if (!err) {
          resolve('file exists');
          return;
        }

        fs.writeFile(
          fname,
          genContents(),
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve('file created');
            }
          }
        );
      });
    });
  };
};

var execCmds = function(cmds) {
  var loop = (function() {
    var i = 0;

    return function(result) {
      if (i === cmds.length) {
        return result;
      }

      var cmd = cmds[i++];

      if (typeof cmd === 'function') {
        return cmd(result).then(loop);
      }

      return exec(cmd).then(loop);
    };
  }());

  return loop();
};

module.exports = function(repoStr) {
  return tmpDir().then(function(dir) {
    var workDir = dir.path;
    console.log(workDir);
    process.chdir(workDir);

    var cleanupOnce = once(function() {
      dir.cleanup();
    });

    return execCmds([
      'git clone ' + repoStr,
      chdirToOnlyDir,

      // If package.json didn't exist, this empty one will cause `npm install` to fail immediately
      // instead of looking through parent directories.
      'touch package.json',

      'npm install',

      createFileIfNeeded('./.eslintrc', function() {
        return JSON.stringify({
          'extends': 'eslint-config-opentok'
        });
      }),

      'npm install eslint eslint-config-opentok',
      'git ls-files | grep \\.js$',

      function(lsFiles) {
        return runEslint(
          lsFiles.stdout.split('\n').filter(function(fname) {
            return fname !== '';
          })
        );
      }
    ]).then(function(result) {
      cleanupOnce();
      return result;
    }).catch(function(err) {
      cleanupOnce();
      throw err;
    });
  });
};
