var unified2 = require('unified2');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var debug = require('debug')('pigsty');
var Monitor = require('./monitor');
var FileMonitor = require('./file_monitor');
var typedefs = unified2.definitions.typedefs;

module.exports = Spooler;

function Spooler(options) {
  var self = this;

  self.options = options || {};
  self.parser = null;
  self.output = options.output;
  self.stopped = false;
  self.monitor = new Monitor(options);
};

Spooler.prototype._monitor_file = function(file) {
  var self = this; 
  if (file) {
    
    self.file = new FileMonitor({
      filename: file.filepath,
      bookmark: self.monitor.bookmark,
      monitor: self.monitor,
      spooler: self,
      logs: self.options.logs
    });

    try {
      self.file.start();
    } catch (err) {
      self.file = null;
      console.log("Error starting up file monitor, skipping: ", err.stack);
      self.next_file();
    }
  }

}

Spooler.prototype.start = function() {
  var self = this;
  var file = self.monitor.current();
  self._monitor_file(file); 
  self.periodic_refresh = setInterval(function() {
    
    self.monitor.update();
    if (!self.file) {
      var next_file = self.monitor.next();  
      if (next_file) {
        self._monitor_file(next_file);
      }; 
    }
   
  }, 5000);
};

Spooler.prototype.process = function(event) {

};

Spooler.prototype.next_file = function() {
  var self = this;
  if (self.monitor.has_next()) {
    
    if (self.file) {
      self.file.stop();
      self.file = null;
    }

    var next_file = self.monitor.next();  
    if (next_file) {
      self._monitor_file(next_file);
    };
  };
};

Spooler.prototype.stop = function() {
  var self = this; 
  self.stopped = true;

  if (self.periodic_refresh) {
    clearInterval(self.periodic_refresh); 
    self.periodic_refresh = null;
  }

  if (self.file) {
    self.file.stop();
    self.file = null;
  }
};



