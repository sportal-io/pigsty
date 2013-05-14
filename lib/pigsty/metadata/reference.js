var debug = require('debug')('pigsty');
var fs = require('fs');
var _ = require('underscore');

module.exports = Reference;

function Reference(file) {
  var self = this;
  self.file = file; 
  self.references = {};
  self.load();
};

Reference.prototype.find = function(name) {
  var self = this;
  var reference = self.reference[name];
  if (reference) {
    return reference;
  };

  return self.references["unknown"];
};

Reference.prototype.load = function() {
  var self = this;

  if (!fs.existsSync(self.file)) {
    throw "Reference.file is missing:" + self.file;
  }

  self.references = {};
  fs.readFileSync(self.file)
  .toString().split('\n').forEach(function (line) { 
    line = line.trim();
    if (line && line[0] != "#" && line.match(/^config reference:/)) {
       line = line.substring("config reference:".length, line.length)
       var items = line.trim().split(/\s+/);
       debug("hello", items);
       if (items.length == 2) {
         var name = items[0];
         var value = items[1];
           
         var reference = {
           name: name,
           value: value
         }
         debug('read reference: ', reference);
         self.references[name] = reference;  
       }
    }
  });
};

var d = new Reference('./config/references/reference.config')


