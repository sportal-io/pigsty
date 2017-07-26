var co = require('co');
var prompt = require('co-prompt');
var confirm = prompt.confirm;
var fs = require('fs');
var wrench = require('wrench');
var path = require('path');
var util = require('util');

function exit(code) {
  process.stdin.destroy();
  process.exit(code);
};

function instructions(config) {
  console.log("[*]");
  console.log("[*] Configuration installed to:", config);
  console.log("[*]");
  console.log("[*] Please edit the configuration before proceeding.");
  console.log("[*] To install output plugins, you must use npm.");
  console.log("[*] E.g., to install `pigsty-mysql`, please run `npm install pigsty-mysql -g` .");
  console.log("[*] Have a special day! ♥");
  exit(0);
};

function setupDirectory(target) {
  wrench.mkdirSyncRecursive(target);
  var template = path.join(__dirname, "../../config/pigsty.config.js.template");
  var config = path.join(target, "pigsty.config.js");
  is = fs.createReadStream(template);
  os = fs.createWriteStream(config);
  is.pipe(os);

  var errhandler = function(err) {

    if (err) {
      console.error("[X] Error setting up config: ", err);
      exit(1);
    } else {
      exit(0);
    }

  };

  is.on('error', errhandler);
  os.on('error', errhandler);

  os.on('end', function() {
  })
  is.on('end', function() {
    instructions(config);
  });

};



function getDirectory(callback) {
  co(function *() {
    var target = yield prompt("Where do you want to install configs? [/etc/pigsty] ");

    if (!target) {
      target = '/etc/pigsty';
    }

    if (fs.existsSync(target)) {
      co(function *(){
        var ok = yield confirm("[X] Path already exists: " + target + ". Do you want us to overwrite it? [y/n] ");

        if (ok) {
          wrench.rmdirSyncRecursive(target);
        } else {
          console.error("[X] Unable to complete setup.");
          exit(1);
        }

        setupDirectory(target);
      });
    } else {
      setupDirectory(target);
    }

  });
};


var run = function() {

  getDirectory(function() {
    exit(0);
  });

};

exports.run = run;

