#!/usr/bin/env node

var argv = require('optimist').argv;
var Spooler = require('../lib/pigsty/spooler');
var config = require('../config/config')

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
