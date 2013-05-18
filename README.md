# Pigsty

Pigsty is designed as a replacement for Barnyard2.  It's written in Javascript
using Node.js.

## Why?

We wanted something that was a little more extensible than Barnyard2.  
Thus, Pigsty was born.

## Installation

    $ install node.js for your platform
    $ git clone git@github.com:threatstack/pigsty.git
    $ cd ./pigsty && npm install
    $ edit ./config/pigsty.config.js
    $ ./bin/pigsty 

## Performance

Currently, the unified2 spooler reads at about 7000eps. Running w/ the pigsty-mysql
output plugin, you'll get ~1000eps.  This should be more than adequate for 
most installations, but we're actively working to make this faster.

## Contributing

### Plugins

To write your own output plugin, please refer to: https://github.com/threatstack/pigsty-example-plugin

Full documentation on writing plugins coming soon.

### Bug Reports

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







