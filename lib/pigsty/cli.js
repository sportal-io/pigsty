var argv = require('optimist').argv;
var version = require('./version');

var Spooler = require('./spooler');
var fs = require('fs');
var path = require('path');

exports.init = function() {
  var command = argv._[0];

  var usage = function() {
    versionOutput();
    console.log('');
    console.log('   Usage: pigsty [-options]');
    console.log('');
    console.log('\t -c, --config     Pigsty configuration file. Default path: /etc/pigsty.config.js');
    console.log('\t -D, --daemon     Run Pigsty in daemon mode.');
    console.log('\t     --validate   Check your Pigsty configuration file for errors.');
    console.log('\t -P, --pid        Specify a pid file (daemon mode only).');
    console.log('\t -V, --verbose    Turn on verbose logging.');
    console.log('\t -v, --version    Application version.')
    console.log('\t -h, --help       Application usage.')
    console.log('')
    console.log('   Sensor Information:');
    console.log('\t -n, --name       Sensor name.')
    console.log('\t -i, --interface  Sensor interface.')
    console.log('');
    console.log('   Log Configurations')
    console.log('\t -d, --dir        Log directory.');
    console.log('\t -m, --match      Logs file must match express to be processed.');
    console.log('\t -M, --mode       Processing mode (continuous|read). Default: continuous');
    console.log('\t -b, --bookmark   Bookmark file path.');
    console.log('');
    console.log('   References:');
    console.log('\t -R, --reference        Reference file.');
    console.log('\t -C, --classification   Classification file.');
    console.log('\t -G, --gen-msg          Gen-msg.map file.');
    console.log('\t -S, --sid-msg          Sid-msg.map file.');
    console.log('');
    console.log('\t Example: pigsty -i en1 -n "Pigsty" -d /logs/ -m unified2.alert.* -c ~/pigsty.config.js -D');
    console.log('');
  };

  var start_daemonized = function(config) {
 
    console.log("[-] Pigsty is starting up (daemonized)...");
    var SubProcess = require('./subprocess');
    var s = new SubProcess(config);
    s.on('error', function(err) {
      console.error("[!] Unable to start Pigsty daemon:", err);
      process.exit(1);
    });
    s.on('started', function(pid) {
      console.log("[-] Pigsty started (PID=" + pid + ")");
    });

    s.start();
  };

  var start = function(config) {

    console.log("[-] Pigsty is starting up...");

    var spooler = new Spooler(config);
    spooler.start();

    process.on('SIGINT', function() {
      console.log("[-] Stopping! Received SIGINT");
      spooler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', function() {
      console.log("[-] Stopping! Received SIGTERM");
      spooler.stop();
      process.exit(0);
    });
  };

  var run = function() {
    var config = parseCLIOptions();
    
    if (validateConfig(config)) {

      if (config.daemonize) {
        start_daemonized(config);
      } else {
        start(config);
      }
    } else {
      process.exit(1);
    };

  }; // run

  var validateConfig = function(config) {
    var valid = true;

    if (!fs.existsSync(config.references.reference_file)) {
      console.error('[X] Could not locate the reference file at '+config.references.reference_file+'.');
      valid = false;
    };

    if (!fs.existsSync(config.references.classification_file)) {
      console.error('[X] Could not locate the classification file at '+config.references.classification_file+'.');
      valid = false;
    };

    if (!fs.existsSync(config.references.gen_file)) {
      console.error('[X] Could not locate the gen-msg.map file at '+config.references.gen_file+'.');
      valid = false;
    };

    if (!fs.existsSync(config.references.sid_file)) {
      console.error('[X] Could not locate the sid-msg.map file at '+config.references.sid_file+'.');
      valid = false;
    };

    if (!fs.existsSync(config.logs.path)) {
      console.error('[X] Log path does not exist: ' + config.logs.path + '.');
      valid = false;
    };

    if (!fs.existsSync(path.dirname(config.logs.bookmark))) {
      console.error('[X] Bookmark path does not exist: ' + config.logs.bookmark + '.');
      valid = false;
    };

    if (config.logs.mode !== "continuous") {
      if (config.logs.mode !== "read") {
        console.error('[X] Invalid log mode: `' + config.logs.mode + '`. Valid Options: `continuous` or `read`');
        valid = false;
      };
    };

    return valid;
  };

  var setup = function() {
    var install = require('./install');
    install.run();

  };

  var parseCLIOptions = function() {

    var config_path = "/etc/pigsty/pigsty.config.js";

    if (argv.c || argv.config) {
      var config_path = path.relative(__dirname, (argv.c || argv.config));
      config_path = path.join(__dirname, config_path);
    };

    if (!fs.existsSync(config_path)) {
      console.error("[!] Configuration file " + config_path + " is missing.");
      console.error("[!] Did you run `sudo pigsty setup`?")
      console.error("[!] Have a special day. ♥")
      process.exit(1);
    };

    var config = require(config_path);

    if (config.unconfigured) {
      console.error("[!] It looks like you didn't edit the config file. Uh oh.");
      console.error("[!] If you did, please make sure you remove the line `unconfigured: true` from " + config_path);
      console.error("[!] Have a special day. ♥")
      process.exit(1);
    }

    if (argv.i || argv.interface) {
      config.sensor.interface = (argv.i || argv.interface);
    };

    if (argv.P || argv.pid) {
      config.daemon = config.daemon || {};
      config.daemon.pid = (argv.P || argv.pid);
    };

    if (argv.R || argv.reference) {
      config.references.reference_file = (argv.R || argv.reference);
    };

    if (argv.C || argv.classification) {
      config.references.classification_file = (argv.C || argv.classification);
    };

    if (argv.G || argv['gen-msg']) {
      config.references.gen_file = (argv.G || argv['gen-msg']);
    };

    if (argv.S || argv['sid-msg']) {
      config.references.sid_file = (argv.S || argv['sid-msg']);
    };

    if (argv.d || argv.dir) {
      config.logs.path = (argv.d || argv.dir);
    };

    if (argv.m || argv.match) {
      config.logs.match_files = (argv.m || argv.match);
    };

    if (argv.M || argv.mode) {
      config.logs.mode = (argv.M || argv.mode);
    };

    if (argv.b || argv.bookmark) {
      config.logs.bookmark = (argv.b || argv.bookmark);
    };
    
    if (argv.n || argv.name) {
      config.sensor.name = (argv.n || argv.name);
    };

    
    if (argv.D || argv.daemonize) {
      config.daemonize = true;
    };

    return config;
  };

  var versionOutput = function() {
    console.log("");
    console.log("\t       ,.");
    console.log("\t      (_|,.");
    console.log("\t     ,' /, )_______   _");
    console.log("\t  __j o``-'        `.'-)'");
    console.log("\t (\")                 \'");
    console.log("\t  `-j                |");
    console.log("\t    `-._(           /");
    console.log("\t       |_\  |--^.  /");
    console.log("\t      /_]'|_| /_)_/");
    console.log("\t         /_]'  /_]'");
    console.log("");
    console.log("\t      Version:  " + version + "      ");
    console.log("\tPigsty by Threat Stack, Inc");
    console.log("\thttps://www.threatstack.com");
    console.log("");
  };

  process.title = "pigsty";

  if (command == 'setup') {
    return setup(); 
  };

  if (argv.validate) {
    var config = parseCLIOptions();
    if (validateConfig(config)) {
      console.log('[*] You configuration file is valid.');
      process.exit();
    };
  };

  if (argv.v || argv.version) {
    versionOutput();
    process.exit();
  };

  if (argv.h || argv.help) {
    usage();
    process.exit();
  };

  run(); 
};
