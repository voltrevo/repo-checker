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

var chdirToOnlyDir = function() {
  return new Promise(function(resolve, reject) {
    fs.readdir('.', function(err, files) {
      if (err) {
        reject(err);
        return;
      }

      console.log(files);

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
};

module.exports = function(repoStr) {
  return tmpDir().then(function(dir) {
    var workDir = dir.path;
    console.log(workDir);
    process.chdir(workDir);

    return execCmds([
      'ls',
      'git clone ' + repoStr,
      'ls',
      chdirToOnlyDir,
      'pwd',
      'ls',

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
      './node_modules/.bin/eslint $(git ls-files | grep \\.js$)'
    ]);
  });
};
