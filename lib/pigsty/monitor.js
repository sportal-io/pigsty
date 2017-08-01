var unified2 = require('unified2');
var fs = require('fs-extra');
var glob = require('glob');
var path = require('path');
var debug = require('debug')('pigsty');
var Archiver = require('./archiver');
var _ = require('underscore');

module.exports = Monitor;

function Monitor(options) {
  var self = this;

  self.options = options;
  self.path = options.logs.path;
  self.glob = options.logs.match_files || "unified2.*";

  if (options.logs && options.logs.archiver) {
    self.archiver = new Archiver(options.logs.archiver);
  };

  self.active_file = null;

  // self.bookmark = {
    // filename: null,
    // timestamp: null,
    // position: null,
  // }; 

  if (!fs.existsSync(self.path)) {
    throw new Error("Cannot monitor path, does not exist: " + self.path); 
  };

  self.bookmark = self._read_bookmark();
  self.files = self._refresh_files();
};

Monitor.prototype._filter_files_by_timestamp = function(files, timestamp) {
  var self = this;
  
  for (var idx in files) {
    var file = files[idx];
    if (file.timestamp.start >= timestamp) {
      break;
    } 
  }

  var to_archive = files.splice(files, idx);

  _.each(to_archive, function(file) {
    if (self.archiver) self.archiver.archive(file.filepath);
  });

  return files;
};

Monitor.prototype._read_files = function() {
  var self = this;
  var match = path.join(self.path, self.glob);
  var files = glob.sync(match) || [];

  files = files.sort(function(a, b) {
    return path.basename(a).localeCompare(path.basename(b));
  });

  return files;
}
/*
 * Read files and enqueue them by ascending time.
 */
Monitor.prototype._refresh_files = function() {
  var self = this;
  var files = self._read_files(); 

  if (files.length == 0) {
    return [];
  }
  
  var result = [];
  var found_bookmark_at = -1; 

  for (var idx in files) {
  
    var file = files[idx]; 
    var position = 0;
   
    if (self.bookmark && self.bookmark.filename == path.basename(file)) {
      found_bookmark_at = idx;
      position =  self.bookmark.position;
    };

    result.push({ 
      position: position,
      filename: path.basename(file),
      filepath: file,
      timestamp: self.timestamp(file)
    })

  };

  if (found_bookmark_at >= 0) {
     var to_archive = result.splice(0, found_bookmark_at);

     _.each(to_archive, function(file) {
       if (self.archiver) self.archiver.archive(file.filepath);
     });
  } else {
    if (self.bookmark && self.bookmark.timestamp) {
      result = self._filter_files_by_timestamp(result, self.bookmark.timestamp);
    }

    if (result && result.length > 0) {
      self.bookmark = {
        filename: result[0].filename,
        position: result[0].position,
        timestamp: result[0].timestamp.start
      }
    };

  }
 return result;
};


Monitor.prototype.timestamp = function(filepath) {
  var self = this;
  var end_time = fs.statSync(filepath).mtime.getTime(); 

  var parts = path.basename(filepath).split(".");
  var end = parts[parts.length - 1];

  if (parseInt(end)) {
    //debug("Read timestamp: ", filepath, { start: parseInt(end) * 1000, end: end_time });
    return { start: parseInt(end) * 1000, end: end_time }; 
  };
  

  return null;
};

Monitor.prototype._bookmark_expired = function(bookmark) {
  var self = this;
  var file = path.join(self.path, bookmark.filename);
  var one_hour = 60 * 60 * 1000;
  
  if (!fs.existsSync(file)) {
    return true;
  };

  // if our bookmark is up to date, and the last modified time > 1 hour
  // then mark it as expired.
  var stat = fs.statSync(file);

  if (stat.size == bookmark.position && (new Date().getTime() - stat.mtime.getTime()) > one_hour) {
    debug('bookmark is expired: ', bookmark);
    return true;
  }

  return false;
};

Monitor.prototype.stop = function() {
  var self = this;
  if (self.bookmark_sync) clearInterval(self.bookmark_sync);

  self._write_bookmark(true);
}


Monitor.prototype._write_bookmark = function(now) {
  var self = this;

  var write = function() {

    if (self.writer)
      return;

    self.writer = true;
    var bookmark = self.options.logs.bookmark || path.join(__dirname, '../../config/.bookmark');
    var path_key = require('crypto').createHash('md5').update(self.path + self.glob).digest("hex");
    var data = {};
    data[path_key] = self.bookmark;
    var tmp = JSON.stringify(data);
    var bm = self.bookmark.position;

    var last_position = self._last_write_position || 0;
    var last_timestamp = self._last_write_timestamp || 0;

    if (self.bookmark && (self.bookmark.timestamp < last_timestamp || (self.bookmark.timestamp == last_timestamp && bm < last_position))) {
      return; // don't write
    }

    if (now) {
      
      debug("Now Sync writing bookmark: ", bookmark, "to", tmp);
      self.writer = false;
      
      try {
        
        fs.writeFileSync(bookmark, tmp);

      } catch (err) {
        console.error("[!] Unable to write bookmark file: ", err.stack);
        console.error("[!] Check to see you have permissions to write to ", bookmark + ".  Exiting.");
        process.exit(1);
      }

      return;
    };
    
    debug("Writing bookmark: ", bookmark, "to", tmp);

    fs.writeFile(bookmark, tmp, function(err) {
      self.writer = false;

      if (err) {
        console.error("[!] Unable to write bookmark file: ", err.stack);
        console.error("[!] Check to see you have permissions to write to ", bookmark + ". Exiting.");
        process.exit(1);
      };

    }) 
  }
 
  if (!now) {

    if (!self.bookmark_sync) {
      debug('scheduling bookmark write');
      self.bookmark_sync = setTimeout(function() {
        self.bookmark_sync = null;
        write();
      }, 5000); 
    }
  } else {
    if (now)
      write();
  }; 
};


Monitor.prototype._read_bookmark = function() {
  var self = this;

  var bookmark = self.options.logs.bookmark || 
    path.join(__dirname, '../../config/.bookmark');
  
  if (fs.existsSync(bookmark)) {
    
    var data = fs.readFileSync(bookmark).toString() || "";
    debug("Read bookmark:", data);

    if (data && data.length > 0) {
      try {
        var tmp = JSON.parse(data);
        var path_key = require('crypto').createHash('md5')
          .update(self.path + self.glob).digest("hex");

        if (tmp[path_key]) {
          var bookmark = tmp[path_key];
          debug("Setting bookmark: ", bookmark);
          return bookmark;
        }; 
      } catch (err) {
        console.log("Bookmark Error: ", err.stack);
      }
    }
  }
};

// pop the next file to monitor off of the queue.
Monitor.prototype.current = function() {
  var self = this;
  return self.active_file;
};

Monitor.prototype.next = function() {
  var self = this;


  if (self.active_file) {
    var popped = self.active_file; 

    if (popped && self.archiver) {
      self.archiver.archive(popped.filepath);
    }
  }

  self.active_file = null;

  if (self.files.length > 0) {
    self.active_file = self.files.splice(0, 1)[0];
   
     self.bookmark = {
        timestamp: self.active_file.timestamp.start,
        filename: self.active_file.filename,
        position: self.active_file.position 
      }
  }

  return self.active_file;
};



Monitor.prototype.update = function() {

  var self = this;
  var files = self._read_files();

  for (var idx in files) {
    var file = files[idx];
    var found = false || (self.active_file && 
      file == self.active_file.filepath);

    if (!found) {
      for (var curr_idx in self.files) {
        current_file_entry = self.files[curr_idx];

        if (current_file_entry.filepath == file) {
          // already exists. 
          found = true; break;
        }
      }
    }

    if (!found && (!self.bookmark || self.timestamp(file).start >= self.bookmark.timestamp)) {
      debug('refresh found new file: ', file);

      self.files.push({
        filepath: file,
        filename: path.basename(file),
        timestamp: self.timestamp(file),
        position: 0 
      });
    }
  };
};

Monitor.prototype.has_next = function() {
  var self = this;
  self.update();
  return (self.files.length > 0);
};


Monitor.prototype.sync = function(bookmark) {
  var self = this;
  self.bookmark = bookmark;
  self._write_bookmark();
};

