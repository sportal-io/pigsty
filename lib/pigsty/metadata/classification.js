var debug = require('debug')('pigsty');
var fs = require('fs');
var _ = require('underscore');

module.exports = Classification;

function Classification(file) {
  var self = this;
  self.file = file; 
  self.classifications = {};
  self.load();
};

Classification.prototype.find = function(name) {
  var self = this;
  var classification = self.classifications[name];
  if (classification) {
    return classification;
  };

  return self.classifications["unknown"];
};

Classification.prototype.load = function() {
  var self = this;

  if (!fs.existsSync(self.file)) {
    throw "Classification file is missing:" + self.file;
  }

  self.classifications = {};
  fs.readFileSync(self.file)
  .toString().split('\n').forEach(function (line) { 
    line = line.trim();
    if (line && line[0] != "#" && line.match(/^config classification:/)) {
       line = line.substring("config classification:".length, line.length)
       var items = line.split(/,/)
       if (items.length == 3) {
         var name = items[0];
         var desc = items[1];
         var severity = items[2];
           
         var classification = {
           name: name,
           description: desc,
           severity: severity
         }
         debug('read classification: ', classification);
         self.classifications[name] = classification;  
       }
    }
  });
};

var d = new Classification('./config/references/classification.config')


