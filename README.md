# Pigsty

Pigsty is designed as a replacement for Barnyard2.  It's written in Javascript
using Node.js.

## Why?

We wanted something that was a little more extensible than Barnyard2. Thus, Pigsty was born.

Pigsty's output architecture is plugin based.  You must install Pigsty, then install
and configure any output plugins you need.

## Installation

### Requirements

Pigsty requires libpcap (`apt get install libpcap-dev` on ubuntu).
You also need to install node.js for your platform.  We recommend v.10.x.
Instructions for doing so are here: [https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

### Ordinary people

    $ install node.js for your platform
    $ npm install pigsty -g
    $ sudo pigsty setup
    $ <edit /etc/pigsty/pigsty.config.js>
    $ npm install pigsty-<pluginname> -g   # repeat for any plugins you need
    $ pigsty                               # run pigsty!

### For developers

    $ install node.js for your platform
    $ git clone git@github.com:threatstack/pigsty.git
    $ cd ./pigsty && npm install
    $ pigsty setup                         # setup your config. 
    $ ./bin/pigsty 

## Output Plugins

Currently, the following plugins are available:

* [pigsty-mysql](https://github.com/threatstack/pigsty-mysql) - MySQL output for Snort ACID schema
* [pigsty-sguil](https://github.com/threatstack/pigsty-sguil) - Sends output to sguild 
* [pigsty-websocket](https://github.com/threatstack/pigsty-websocket) - Websocket output plugin 
* [pigsty-mongodb](https://github.com/threatstack/pigsty-websocket) - MongoDB output plugin
* [pigsty-syslog](https://github.com/threatstack/pigsty-syslog) - Syslog output plugin
* [pigsty-irc](https://github.com/threatstack/pigsty-irc) - IRC output plugin
* [pigsty-rest](https://github.com/threatstack/pigsty-rest) - Rest output plugin by [larsx](https://github.com/larsx2) (Eduardo Urias)

To install, type `npm install <plugin> -g`, e.g. `npm install pigsty-mysql -g`

## Upgrading

To upgrade pigsty to the latest version, run `npm upgrade -g pigsty`.

To upgrade any output plugin, please run `npm upgrade -g <plugin_name>`.

## Usage

```
	       ,.
	      (_|,.
	     ,' /, )_______   _
	  __j o``-'        `.'-)'
	 (")                 '
	  `-j                |
	    `-._(           /
	       |_  |--^.  /
	      /_]'|_| /_)_/
	         /_]'  /_]'
	         
	Pigsty by Threat Stack, Inc
	https://www.threatstack.com


   Usage: pigsty [-options]

	 -c, --config     Pigsty configuration file. Default path: /etc/pigsty.config.js
	 -D, --daemon     Run Pigsty in daemon mode.
	     --validate   Check your Pigsty configuration file for errors.
   -P, --pid        Specify a pid file (daemon mode only).
	 -V, --verbose    Turn on verbose logging.
	 -v, --version    Application version.
	 -h, --help       Application usage.

   Sensor Information:
	 -n, --name       Sensor name.
	 -i, --interface  Sensor interface.

   Log Configurations
	 -d, --dir        Log directory.
	 -m, --match      Logs file must match express to be processed.
	 -M, --mode       Processing mode (continuous|read). Default: continuous
	 -b, --bookmark   Bookmark file path.

   References:
	 -R, --reference        Reference file.
	 -C, --classification   Classification file.
	 -G, --gen-msg          Gen-msg.map file.
	 -S, --sid-msg          Sid-msg.map file.

	 Example: pigsty -i en1 -n "Pigsty" -d /logs/ -m unified2.alert.* -c ~/pigsty.config.js -D
```

## Configuration Options in pigsty.config.js 

### Enable Archiving

Add a section 'archiver' under logs to enable archving
to an alternative directory after processing.

```js
logs: {
   
   ...

   archiver: {
     action: 'move',  // can also be 'delete' 
     dst: '/tmp/snort/processed' // where to move logs 
   }
}
```


## Performance

Currently, the unified2 spooler reads at about 7000eps. Running w/ the pigsty-mysql
output plugin, you'll get ~1000eps.  This should be more than adequate for 
most installations, but we're actively working to make this faster.

## Contributing

### Plugins

To write your own output plugin, please refer to: https://github.com/threatstack/pigsty-example-plugin

Full documentation on writing plugins coming soon.

### Issues 

#### FAQ

##### Q. Can't install; `npm install pigsty -g` is reporting pcap errors:

```
make: Entering directory `/usr/lib/node_modules/pigsty/node_modules/unified2/node_modules/pcap/build'
  CXX(target) Release/obj.target/pcap_binding/pcap_binding.o
../pcap_binding.cc:5:23: fatal error: pcap/pcap.h: No such file or directory
compilation terminated.
make: *** [Release/obj.target/pcap_binding/pcap_binding.o] Error 1
make: Leaving directory `/usr/lib/node_modules/pigsty/node_modules/unified2/node_modules/pcap/build'
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2
gyp ERR! stack     at ChildProcess.onExit (/usr/lib/node_modules/npm/node_modules/node-gyp/lib/build.js:267:23)
gyp ERR! stack     at ChildProcess.EventEmitter.emit (events.js:98:17)
gyp ERR! stack     at Process.ChildProcess._handle.onexit (child_process.js:789:12)
gyp ERR! System Linux 3.5.0-17-generic
  SOLINK_MODULE(target) Release/obj.target/binding.node
```

A. Make sure you install libpcap


##### Q. I installed pigsty using `npm install pigsty -g` but I don't have the pigsty binary

A.  Usually, it will get symlinked to /usr/bin.  Depending on your platform, npm bin/ path is probably not in your path.  
You can look for it using `find / -name "pigsty"`.


#### Reporting

Use the git issues, or send an email to support@threatstack.com

## License

Copyright (C) 2013 Threat Stack, Inc (https://www.threatstack.com)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.







