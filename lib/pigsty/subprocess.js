var spawn = require('child_process').spawn;
var path = require('path');
var debug = require('debug')('pigsty');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function SubProcess(options) {
  var self = this;
  options = options || {};
  options.daemon = options.daemon || {};

  self.pid_file = options.daemon.pid || "/etc/pigsty/pigsty.pid";
  self.log_path = options.daemon.log || "/var/log/pigsty.log"; 
};

util.inherits(SubProcess, EventEmitter);

SubProcess.prototype.stripArgs = function(args) {

  var updated = [];

  for (var i in args) {
    var arg = args[i];
    if (arg != "-D") {
      updated.push(arg); 
    }
  }

  return updated;
};


SubProcess.prototype.readPid = function() {
  var self = this;

  if (fs.existsSync(self.pid_file)) {
    try {
      return parseInt(fs.readFileSync(self.pid_file));
    } catch (err) {
      debug("pid read error:", err);
    }
  }

  return null;
};

SubProcess.prototype.start = function() {
  var self = this;

  var pid = self.readPid();

  if (pid) {
    self.running(pid, function(started, pid) {
      if (started) {
        self.emit('error', "Pigsty already running (PID=" + pid + " reported in " + self.pid_file + ").")
      }  else {
        self._start();
      }
    });
  
  } else {
    self._start();
  }

};

SubProcess.prototype._start = function() {
  var self = this;

  var bin = process.argv[0];
  var args = process.argv.splice(1);

  args = self.stripArgs(args);
  // remove -D 

  var out = fs.openSync(self.log_path, 'w');
  var err = fs.openSync(self.log_path, 'a');

  var options = {
    detached: true,
    stdio: [ 'ignore', out, err],
    env: process.env
  };

  debug('starting: ', bin, args, options);

  var child = spawn(bin, args, options);

  child.unref();
  var count = 0;
  var stdoutbuf = "";
  var exited = false;
  var exit_code = 0;

  // wait at least 5 seconds for exit.
  child.on('exit', function(code, signal) {
    exit_code = code;
    exited = true;
  });

  var pid = child.pid;

  self.checkRunning = setInterval(function() {

    count += 1;

    if (exited || count > 5) {
      clearInterval(self.checkRunning);
      self.emit('error', "Start timed out");
    } else {

      self.running(pid, function(started, pid) {
        if (started) {
          fs.writeFileSync(self.pid_file, pid); 
          debug('started with pid:', pid, "writing to:", self.pid_file);
          child.unref();
          clearInterval(self.checkRunning);
          self.emit('started', pid);
        } 
      });
    }            
  }, 1000);
};


SubProcess.prototype.running = function(pid, callback) {
  var self = this;

  try {

    debug('checking pid:', pid)
    var check = process.kill(pid, 0);
    if (callback && (typeof callback === "function")) {
      callback(true, pid);
    };
    return;

  } catch (err) {

    debug(err, err.toString());

    // err.printStackTrace();
    switch(err.code.toString()) {
      case 'EPERM':
        if (callback && (typeof callback === "function")) {
        callback(true, pid);
      };
      break;
      case 'ESRCH':
        if (callback && (typeof callback === "function")) {
        callback(false, pid);
      };
      break;
      default:
        if (callback && (typeof callback === "function")) {
        callback(true, pid);
      };
    }
  }
};

module.exports = SubProcess;
