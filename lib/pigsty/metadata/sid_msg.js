var debug = require('debug')('pigsty');
var fs = require('fs');
var _ = require('underscore');
var Reference = require('./reference');
module.exports = SidMap;

function SidMap(file, references) {
  var self = this;
  self.file = file; 
  self.sid_maps = {};
  self.references = new Reference(references); 
  self.load();
};

SidMap.prototype.find = function(name) {
  var self = this;
  var sid_map = self.sid_maps[name];
  if (sid_map) {
    return sid_map;
  };

  return self.sid_maps["unknown"];
};

SidMap.prototype.load = function() {
  var self = this;

  if (!fs.existsSync(self.file)) {
    throw "SidMap.file is missing:" + self.file;
  }

  self.sid_maps = {};
  fs.readFileSync(self.file)
  .toString().split('\n').forEach(function (line) { 

    line = line.trim();
    if (line && line[0] != "#") {
      var items = line.trim().split(/\|\|/);
      var id = parseInt(items[0].trim());
      var name = items[1].trim();
      var references = [];

      if (items[2]) {
        items[2].split(/\s+/).forEach(function(r) {
          r = r.trim().split(',');
          if (r.length === 2) {
            var key = r[0].trim();
            var val = self.references.find(key) || "";

            references.push({
              key: key,
              value: val + r[1].trim()
            });
          };
        });
      };

      var sid_map = {
        id: id,
        name: name,
        gen_id: 1,
        references: references
      };

      debug('read sid_map: ', sid_map);
      self.sid_maps[id] = sid_map;  
    };
  });
};

//var d = new SidMap('./config/references/sid-msg.map')


