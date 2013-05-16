var argv = require('optimist').argv;
var version = require('./version');

exports.init = function() {
  var command = argv._[0];

  var usage = function() {
    console.log('Pigsty - Version: %s', version);
    console.log('');
    console.log('pigsty [command] [options]');
    console.log('');
    console.log('\t setup     Create or edit your Snorby Cloud Agent configurations.');
    console.log('\t remove    Uninstall the snorby agent.');
    console.log('\t upgrade   Upgrade the Snorby Agent.');
    console.log('\t version   Version Information.');
    console.log('\t help      Application Usage.')
    console.log('');
    console.log('Commands:');
    console.log('\t start     [<all>,nids,hids] - Start the Snorby Agent.    Default: all');
    console.log('\t stop      [<all>,nids,hids] - Stop the Snorby Agent.     Default: all');
    console.log('\t restart   [<all>,nids,hids] - Restart the Snorby Agent. Default: all');
    console.log('\t status    [<all>,nids,hids] - Show Snorby Agent status.  Default: all');
    console.log('');
    console.log('\t Example: pigsty -l /logs/*.log -c ~/pigsty.config.js -D');
    console.log('');
    console.log('Copyright %s - Threat Stack, Inc - https://threatstack.com', new Date().getFullYear());
  };

  var run = function() {
    switch(command.toString()) {
      case 'start':

      break;

      case 'stop':
      break;

      case 'config':
      break;

      case 'restart':
      break;

      case 'bootstrap':
      break;
      case 'status':
      break;

      case 'setup':
      break;

      case 'remove':
      break;

      case 'version':
        versionOutput();
      break;

      case 'help':
        usage();
      break;

      default:
        console.log('Unknown Argument', "`%s` is not an available argument.", command);
      console.log();
      usage();
    }

  }; // run

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

  if (command) {
    if ((command === "version")) {
      run(); 
    } else {
      run();
    };
  } else {
    usage();
  };

};
