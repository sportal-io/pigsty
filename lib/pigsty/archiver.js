var fs = require('fs-extra');
var debug = require('debug')('pigsty');
var path = require('path');
var _ = require('underscore');
var os = require('os');
var mv = require('mv');

function Archiver(options) {
  var self = this;

  if (options.action != 'move' &&
      options.action != 'delete' &&
      options.action != 'none') {
    console.error("[X] Archiver action is invalid:", options.action, " -- must be 'none', 'move' or 'delete'.");
    process.exit(1);
  }
  
  self.action = options.action;

  debug('enabled archiving:', options.action);

  if (options.action == 'move') {
    self.dst = options.dst;
    if (!self.dst) {
      console.error("[X] Archiver dst is required and must be a valid path."); 
      process.exit(1);
    }
    if (!fs.existsSync(self.dst)) {
      fs.ensureDirSync(self.dst);
    }
    self._handle = function(filename) {
      var base = path.basename(filename);
      var dst = path.join(self.dst, base);
      debug('moving', filename, 'to', dst);
      mv(filename, dst, function(err) {
        if (err) console.error('[X] Error performing rollover:', err);  
      });
    };
  } else if (options.action == 'delete'){
    self._handle = function(filename) {
      try {
        debug('unlinking', filename)
        fs.unlinkSync(filename); 
      } catch (err) {
        console.error('[X] Error deleting file:', err);
      }
    }
  } else {
    // noop
    self._handle = function(filename) {};
  }

};

Archiver.prototype.archive = function(filename) {
  this._handle(filename);
};


module.exports = Archiver;
