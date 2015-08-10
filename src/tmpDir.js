'use strict';

var tmp = require('tmp');

module.exports = function() {
  return new Promise(function(resolve, reject) {
    tmp.dir(function(err, path, cleanup) {
      if (err) {
        reject(err);
      } else {
        resolve({ path: path, cleanup: cleanup });
      }
    });
  });
};
