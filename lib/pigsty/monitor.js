var unified2 = require('unified2');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var debug = require('debug')('pigsty');

module.exports = Monitor;

function Monitor(options) {
  var self = this;

  self.options = options;
  self.path = options.logs.path;
  self.glob = options.logs.match_files || "unified2.*";
  
  self.bookmark = {
    filename: null,
    timestamp: null,
    position: null,
  }; 

  if (!fs.existsSync(self.path)) {
    throw new Error("Cannot monitor path, does not exist: " + self.path); 
  };

  self._read_bookmark();
  self.files = self._refresh_files();
  self.active_file = null;
};

Monitor.prototype._filter_files_by_timestamp = function(files, timestamp) {
  var self = this;
  
  for (var idx in files) {
    var file = files[idx];
    if (file.timestamp.start >= timestamp) {
      break;
    }
  }

  files.splice(files, idx);
  return files;
};

Monitor.prototype._read_files = function() {
  var self = this;
  var match = path.join(self.path, self.glob);
  var files = glob.sync(match) || [];

  files = files.sort(function(a, b) {
    path.basename(a).localeCompare(path.basename(b));
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
   
    if (self.bookmark && self.bookmark.filename == path.basename(file)) {
      found_bookmark_at = idx;
    };

    result.push({ 
      filename: path.basename(file),
      filepath: file,
      timestamp: self.timestamp(file)
    })

  };


  if (found_bookmark_at >= 0) {
    result.splice(0, found_bookmark_at);
  } else {
    if (self.bookmark && self.bookmark.timestamp) {
      result = self._filter_files_by_timestamp(result, self.bookmark.timestamp);
    }
    
    if (result && result.length > 0) {
      self.bookmark = {
        filename: result[0].filename,
        position: 0,
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


Monitor.prototype._write_bookmark = function() {
  var self = this;
 
  if (self.writer) {
    if (!self.sync) {
      debug('scheduling bookmark write');
      self.sync = setTimeout(function() {
        self.sync = false;
        self._write_bookmark();
      }, 1000); 
    }
  } else {

    debug("Writing bookmark: ", self.bookmark)
    self.writer = true;
    var bookmark = self.options.logs.bookmark || path.join(__dirname, '../../config/.bookmark');
    var path_key = require('crypto').createHash('md5').update(self.path + self.glob).digest("hex");
    var data = {};
    data[path_key] = self.bookmark;
    var tmp = JSON.stringify(data);
    fs.writeFile(bookmark, tmp, function(err) {
      self.writer = false;
    })
  }; 
};


Monitor.prototype._read_bookmark = function() {
  var self = this;

  var bookmark = self.options.logs.bookmark || path.join(__dirname, '../../config/.bookmark');
  
  if (fs.existsSync(bookmark)) {
    
    var data = fs.readFileSync(bookmark).toString() || "";
    debug("Read bookmark:", data);

    if (data && data.length > 0) {
      try {
        var tmp = JSON.parse(data);
        var path_key = require('crypto').createHash('md5').update(self.path + self.glob).digest("hex");

        if (tmp[path_key]) {
          self.bookmark = tmp[path_key];
          debug("Setting bookmark: ", self.bookmark);
        }; 
      } catch (err) {
        console.log("Error: ", err.stack);
      }
     
    }
  }
};

// pop the next file to monitor off of the queue.
Monitor.prototype.current = function() {
  var self = this;

  if (self.files.length > 0) {
    return self.files[0];
  };

  return null;
};

Monitor.prototype.next = function() {
  var self = this;
  if (self.files.length > 0) {
    self.files.splice(0, 1);
    if (self.files.length > 0 ) {
      
      self.bookmark = {
        timestamp: self.files[0].timestamp.start,
        filename: self.files[0].filename,
        position: 0
      }
      return self.files[0]
    }
  }

  return null;
};



Monitor.prototype.update = function() {
  var self = this;
  var files = self._read_files();
  
  for (var idx in files) {
    var file = files[idx];
    var found = false;

    for (var curr_idx in self.files) {
      current_file_entry = self.files[curr_idx];
      if (current_file_entry.filepath == file) {
        // already exists. 
        found = true; break;
      }
    }
   
    if (!found && self.timestamp(file).start >= self.bookmark.timestamp) {
      debug('refresh found new file: ', file);
      self.files.push({
        filepath: file,
        timestamp: self.timestamp(file)
      });
    }
  };
};

Monitor.prototype.has_next = function() {
  var self = this;
  self.update();
  return (self.files.length > 1);
};


Monitor.prototype.sync = function(bookmark) {
  var self = this;
  self.bookmark = bookmark;
  self._write_bookmark();
};

