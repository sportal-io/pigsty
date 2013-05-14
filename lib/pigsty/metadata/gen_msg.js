var debug = require('debug')('pigsty');
var fs = require('fs');
var _ = require('underscore');

module.exports = GenMap;

function GenMap(file) {
  var self = this;
  self.file = file; 
  self.gen_maps = {};
  self.load();
};

GenMap.prototype.find = function(name) {
  var self = this;
  var gen_map = self.gen_map[name];
  if (gen_map) {
    return gen_map;
  };

  return self.gen_maps["unknown"];
};

GenMap.prototype.load = function() {
  var self = this;

  if (!fs.existsSync(self.file)) {
    throw "GenMap.file is missing:" + self.file;
  }

  self.gen_maps = {};
  fs.readFileSync(self.file)
  .toString().split('\n').forEach(function (line) { 

    line = line.trim();
    if (line && line[0] != "#") {
      var items = line.trim().split(/\|\|/);
      var gen_id = parseInt(items[0].trim());
      var sig_id = parseInt(items[1].trim());
      var message = items[2].trim();

      var gen_map = {
        gen_id: gen_id,
        sig_id: sig_id,
        message: message
      };

      debug('read gen_map: ', gen_map);
      self.gen_maps[gen_id] = gen_map;  
    };
  });
};

var d = new GenMap('./config/references/gen-msg.map')


