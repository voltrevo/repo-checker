'use strict';

var logWrap = require('./logWrap.js');

var childProcessPromise = require('child-process-promise');
var exec = logWrap('exec', childProcessPromise.exec);
var spawn = childProcessPromise.spawn;
var fs = require('fs');
var tmpDir = logWrap('tmpDir', require('./tmpDir.js'));

/* var debugExec = function(cmd) {
  return exec(cmd).then(function(result) {
    console.log('  stdout:', result.stdout);
    console.log('  stderr:', result.stderr);

    return result;
  });
}; */

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
        var stdout = '';
        var stderr = '';

        console.log('lsFiles:', lsFiles);

        return new Promise(function(resolve, reject) {
          spawn(
            './node_modules/.bin/eslint',
            lsFiles.stdout.split('\n').filter(function(fname) {
              return fname !== '';
            })
          ).progress(function(childProcess) {
            childProcess.stdout.on('data', function(data) {
              stdout += data.toString();
            });

            childProcess.stderr.on('data', function(data) {
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

            childProcess.stdout.on('end', function() {
              stdoutFinished = true;
              tryEnd();
            });

            childProcess.stderr.on('end', function() {
              stderrFinished = true;
              tryEnd();
            });
          });
        });
      }
    ]);
  });
};
