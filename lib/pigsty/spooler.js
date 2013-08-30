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

/**
 *
 * Spooler for Pigsty.
 *
 * @param {Object} options - config object (see pigsty.config.js)
 */
function Spooler(options) {
  var self = this;

  self.options = options || {};
  self.parser = null;
  self.output = options.output;
  self.stopped = false;
  self.paused = 0;

  // in the future, support multiple directories
  // to monitor and such.
  self.monitor = new Monitor(options);
  self.processor = new Processor(options);

  self.processor.on('data', function(event) {
    self._send_to_plugins(event);
  })

  self._setup_output_plugins();
};

/**
 * Send output to plugins.  
 *
 * @param {event} Event supplied by processor
 *
 * @private
 */
Spooler.prototype._send_to_plugins = function(event) {
  var self = this;
  //  debug('received event:', event);
  var pause_required = false;

  _.each(self.output_plugins, function(plugin) {
    plugin.send(event);
  });

};


/**
 * Configure any output plugins in pigsty.config.js output section.
 *
 * @private
 */

Spooler.prototype._setup_output_plugins = function() {
  var self = this;
  self.output_plugins = [];
  _.each(Object.keys(self.options.output), function(key) {

    var plugin_name = 'pigsty-' + key;

    var setup = function(config) {
      
      try {

        config.sensor = self.options.sensor;

        var plugin = require(plugin_name)(config);
        plugin.on('error', function(error) {
          //TODO: allow custom error handlers in plugin.config.js
          console.error("Received error from plugin " + plugin_name + ": ", error);
        })
      } catch (err) {
        debug("plugin load failure: ", err.stack)
        console.error("[!] There was a problem installing the output plugin: " + plugin_name);
        console.error("[!] Error was:", err);
        console.error("[!] Do you have the plugin installed? Try doing: npm install " + plugin_name + " -g");
        console.error("[!] Have a special day. ♥")
        process.exit(1);
      };

      self.output_plugins.push(plugin);
    };
   
    if (self.options.output[key] instanceof Array) {
      // output to multiple instances of the plugin.
      _.each(self.options.output[key], function(config) {
        setup(config); 
      })
    } else {
      setup(self.options.output[key]);
    }

  });
};


/** 
 *
 *
 */
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
      console.log("[!] Error starting up file monitor, skipping:", file.filepath, "Got error:", err.message);
      debug("Error was:", err.stack);
      console.log("[!] Please verify you have permissions to read from:", file.filepath);
      self.next_file();
    }
  }

}

Spooler.prototype.start = function() {
  var self = this;
  var file = self.monitor.current();

  var start = function() {
    debug('all plugins ready. beginning processing.');
    self._monitor_file(file); 

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

  var waiting = self.output_plugins.length; 
  _.each(self.output_plugins, function(plugin) {
    plugin.on('ready', function() {
       waiting--; 
       if (waiting == 0) start();
    });


    plugin.on('ok', function() {
   
      self.paused--;
      if (self.file && self.paused == 0) {
        debug('unpausing');
        self.file.unpause();
        self.processor.start();
      };

    })

    plugin.on('full', function() {
   
      if (self.file && !self.paused) {
        debug('pausing - plugin is full');
        self.file.pause();
        self.processor.stop();
      };

      self.paused++;
    })

    plugin.start();
  });

  self.processor.start();
};

/** 
 *
 * Send an event to the processor, so it can be normalized.
 *
 * TODO: this should really be handled by an event emitted by the file
 * monitor.
 *
 * @param {Object} event - unified2 record produced by unified2 lib 
 *
 * @public
 */
Spooler.prototype.process = function(event) {
  var self = this;
  self.processor.process(event);
};


/**
 *
 * Move to the next file in the monitor if there is one.
 * Otherwise, continue to tail the current file until more data is received.
 *
 * @public
 */
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

/**
 * Stop the spooler
 *
 * @param {Function} callback - Callback to call after stop is completed.
 *
 * @public
 */
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
  };

  self.processor.stop();

  if (callback)
    callback(); 

};



