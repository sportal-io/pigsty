var path = require('path');
var debug = require('debug')('pigsty');

function Bookmark(options) {
  var self = this;
  self.options = options;

  self.key = require('crypto').createHash('md5')
    .update(options.logs.path + options.glob).digest("hex");


  self.path = options.bookmark || path.join(__dirname, 
      path.join(__dirname, '../../config/.bookmarks/bookmark-' + 
               self.key)); 
  
  self.bookmark = {};

  self._read();
};


Bookmark.prototype._read = function() {
  var self = this;
  
  if (fs.existsSync(self.path)) {
    var data = fs.readFileSync(self.path).toString() || "";
    debug("Read bookmark:", data);
    if (data && data.length > 0) {
      try {
        self.bookmark = JSON.parse(data);
      } catch (err) {
        console.error("Error: ", err.stack);
      }
    }
  }
};
