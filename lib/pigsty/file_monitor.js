var unified2 = require('unified2');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var debug = require('debug')('pigsty');
var monitor = require('./monitor');

module.exports = FileMonitor;

function FileMonitor(options) {
  var self = this;

  self.options = options;
  self.filename = options.filename;
  self.bookmark = options.bookmark;
  self.monitor = options.monitor;
  self.spooler = options.spooler;

  self.eof = false;
};

/*
 * Sync bookmark to disk. 
 */
FileMonitor.prototype.sync = function() {
  var self = this;
  self.monitor.sync(self.bookmark);
};


FileMonitor.prototype.pause = function() {
  var self = this;
  self.monitor.sync(self.bookmark);
  if (self.parser)
    self.parser.pause();
 
};


FileMonitor.prototype.unpause = function() {
  var self = this;
  self.monitor.sync(self.bookmark);
  if (self.parser)
    self.parser.unpause();
 
};


FileMonitor.prototype.stop = function() {
  var self = this;
  self.monitor.sync(self.bookmark);
  if (self.parser)
    self.parser.stop();
 
};

FileMonitor.prototype._clear_watch = function() {
  var self = this;
 
  if (self.watch) {
    clearInterval(self.watch);
    self.watch = null;
  }
};



FileMonitor.prototype.start = function() {
  var self = this; 

  var options = {};

  console.log("[-] Starting monitoring: ", self.filename)
  self.options.logs.mode = self.options.logs.mode || 'continuous';
  
  if (self.options.logs.mode != 'continuous') {
    options['tail'] = false;
  } else {
    options['tail'] = true;
  };
 
  options['offset'] = self.bookmark.position;
  options['skip_errors'] = true;

  self.parser = new unified2.Parser(self.filename, options);
  
  self.parser.on('error', function(err) {
    console.log("[X] An error was received: ", err); 
  });

  self.parser.on('eof', function(data) {

    self.bookmark.position = self.parser.last_read_position; 
    self.sync();

    if (self.monitor.has_next()) {
      // end this so we can proceed to the next.
      self.parser.stop();
    } else {
      // otherwise we'll allow it to wait.
      // set a timeout to check every x minutes for more.
      if (!self.watch) {
        self.watch = setInterval(function() {
          
          debug('looking for new files..')
          if (self.monitor.has_next()) {
            // end this so we can proceed to the next.
            debug('found another file - close file', self.filename);
            self.parser.stop();
          };         

        }, 5000);
      }
    }
  });
 
  self.parser.on('data', function(data) {
    self._clear_watch();
    self.spooler.process(data);
    self.bookmark.position = self.parser.last_read_position; 
    self.sync();
    // update event bookmark.
  });
 
  self.parser.on('rollover', function(data) {
    self._clear_watch();
    console.log("Reached rollover: ", self.filename);
    self.bookmark.position = self.parser.last_read_position; 
    self.sync();
    self.spooler.next_file();
  });

  self.parser.on('end', function() {
    self._clear_watch();
    debug('received end from parser: ', self.filename);
    self.bookmark.position = self.parser.last_read_position; 
    self.sync();
    self.spooler.next_file();
  });

  self.parser.run();
};

