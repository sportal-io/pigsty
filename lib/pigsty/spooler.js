var unified2 = require('unified2');
var fs = require('fs');
var _ = require('underscore');
var glob = require('glob');
var path = require('path');
var debug = require('debug')('pigsty');
var Monitor = require('./monitor');
var Processor = require('./processor');

var FileMonitor = require('./file_monitor');
var typedefs = unified2.definitions.typedefs;

module.exports = Spooler;

function Spooler(options) {
  var self = this;

  self.options = options || {};
  self.parser = null;
  self.output = options.output;
  self.stopped = false;

  // in the future, support multiple directories
  // to monitor and such.
  self.monitor = new Monitor(options);
  self.processor = new Processor(options);

  self.processor.on('data', function(event) {
    self._send_to_plugins(event);
  })

  self._setup_output_plugins();
};

Spooler.prototype._send_to_plugins = function(event) {
  var self = this;
  //  debug('received event:', event);
  _.each(self.output_plugins, function(plugin) {
    plugin.send(event);
  });
}



Spooler.prototype._setup_output_plugins = function() {
  var self = this;
  self.output_plugins = [];
  if (self.output instanceof Array) {
    // TODO: handle these differently 
  } else {
    _.each(Object.keys(self.options.output), function(key) {
      
      var plugin = 'pigsty-' + key;
      
      try {
        plugin = require(plugin)(self.options.output[key]);
        plugin.configure();
        plugin.start();
      } catch (err) {
        debug("plugin load failure: ", err.stack)
        console.error("[X] There was a problem installing the output plugin: " + plugin);
        console.error("[X] Error was:", err);
        console.error("[X] Do you have the plugin installed? Try doing: npm install " + plugin);
        console.error("[X] Have a special day.");
        process.exit(1);
      };
      
      self.output_plugins.push(plugin);
    
    })
  }

}

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

  _.each(self.output_plugins, function(plugin) {
    plugin.start();
  })

  self.periodic_refresh = setInterval(function() {
    self.monitor.update();

    if (!self.file) {
      var next_file = self.monitor.next();  
      if (next_file) {
        self._monitor_file(next_file);
      }; 
    }
  }, 2000);
};

Spooler.prototype.process = function(event) {
  var self = this;
  self.processor.process(event);
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

Spooler.prototype.stop = function(callback) {
  var self = this; 
  self.stopped = true;

  if (self.periodic_refresh) {
    clearInterval(self.periodic_refresh); 
    self.periodic_refresh = null;
  };

  if (self.file) {
    self.file.stop();
    self.file = null;
  }

  if (self.monitor) {
    self.monitor.stop();
  } else {
    callback(); 
  }

};



