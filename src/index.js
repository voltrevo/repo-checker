'use strict';

var childProcessPromise = require('child-process-promise');
var defaultDefaultConfig = require('./defaultConfig.js');
var exec = childProcessPromise.exec;
var runEslint = require('./runEslint.js');
var fs = require('fs');
var tmpDir = require('./tmpDir.js');

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

var execCmds = function(cmds, logger) {
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

      logger('cmd: ' + cmd);

      return exec(cmd).then(loop);
    };
  }());

  return loop();
};

module.exports = function(repoStr, defaultConfigParam, logger) {
  var defaultConfig = defaultConfigParam || defaultDefaultConfig;

  logger('start');

  return tmpDir().then(function(dir) {
    var tempDir = dir.path;
    logger('temp dir: ' + tempDir);
    process.chdir(tempDir);

    var cleanupOnce = once(function() {
      logger('cleaning up temp dir');
      dir.cleanup();
    });

    return execCmds(
      [
        'git clone ' + repoStr,
        chdirToOnlyDir,

        // If package.json didn't exist, this empty one will cause `npm install` to fail immediately
        // instead of looking through parent directories.
        'touch package.json',

        'npm install',

        createFileIfNeeded('./.eslintrc', function() {
          return JSON.stringify({
            'extends': defaultConfig
          });
        }),

        'npm install eslint ' + defaultConfig,
        'git ls-files | grep \\.js$',

        function(lsFiles) {
          logger('running eslint');

          return runEslint(
            lsFiles.stdout.split('\n').filter(function(fname) {
              return fname !== '';
            })
          );
        }
      ],
      logger
    ).then(function(result) {
      cleanupOnce();
      return result;
    }).catch(function(err) {
      cleanupOnce();
      throw err;
    });
  });
};
