#!/usr/bin/env node

var argv = require('optimist').argv;
var Spooler = require('../lib/pigsty/spooler');
var fs = require('fs');
var path = require('path');

if (!fs.existsSync(path.join(__dirname, '../config/pigsty.config.js'))) {

  console.error("[!] Configuration file config.js is missing.");
  console.error("[!] Please `cp config/config.js.template config/config.js` and edit appropriately.");

  process.exit(1);
};

var config = require('../config/pigsty.config')

var spooler = new Spooler(config);
spooler.start();

process.on('SIGINT', function() {
  spooler.stop();
  process.exit(0);
})

process.on('SIGTERM', function() {
  spooler.stop();
  process.exit(0);
})
