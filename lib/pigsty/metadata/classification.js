var debug = require('debug')('pigsty');
var fs = require('fs-extra');
var _ = require('underscore');

module.exports = Classification;

function Classification(file) {
  var self = this;
  self.file = file; 
  self.classifications = {};
  self.load();
};

Classification.prototype.find = function(id) {
  var self = this;
  var classification = self.classifications[id];
  if (classification) {
    return classification;
  };

  debug('WARNING: missing classification: ', id);
  return { name: 'unknown', description: 'unknown', severity: 1 };
};

Classification.prototype.load = function() {
  var self = this;

  if (!fs.existsSync(self.file)) {
    throw "Classification file is missing:" + self.file;
  }

  var id = 0;
  self.classifications = {};
  fs.readFileSync(self.file)
  .toString().split('\n').forEach(function (line) { 
    line = line.trim();
    if (line && line[0] != "#" && line.match(/^config classification:/)) {
       line = line.substring("config classification:".length, line.length)
       var items = line.split(/,/)
       if (items.length == 3) {
         id += 1;
         var name = items[0].trim();
         var desc = items[1].trim();
         var severity = parseInt(items[2].trim());
           
         var classification = {
           name: name,
           description: desc,
           severity: severity
         }
         debug('read classification: ', classification);
         self.classifications[id] = classification;  
       }
    }
  });
};


