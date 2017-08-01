var unified2 = require('unified2');
var fs = require('fs-extra');
var path = require('path');
var debug = require('debug')('pigsty');
var typedefs = unified2.definitions.typedefs;
var Task = require('./task');
var metadata = require('./metadata');

EventProcessor.prototype = new Task();
EventProcessor.prototype.constructor = EventProcessor;
module.exports = EventProcessor;

// non-retarded iplong2str
function iplong2str(ip) {
   var d = (ip) & 0xff;
   var c = (ip >> 8) & 0xff;
   var b = (ip >> 16) & 0xff;
   var a = (ip >> 24) & 0xff;
   return a + "." + b + "." + c + "." + d;
};

/**
 * Recursively iterate over the object and
 * remove buffers
 *
 */ 
function makeJson(object) {


  if (object == null) {
    return null;
  }
 
  if (typeof object !== 'object') {
    return object;
  };

  if (object instanceof Buffer) {
    return null; 
  }


  if (object instanceof Array) {
    var copy = [];
    for (var i in object) {
      var item = object[i];
      copy.push(makeJson(item))
    };

    return copy;
  
  } else {
    
    var copy = {};

    if (typeof object.toObject == 'function') {
       copy = object.toObject();
    };

    for (var i in Object.keys(object)) {
      
      var k = Object.keys(object)[i];
      var item = object[k];
      
      if (copy[k])
        continue;

      if (typeof item == 'function') {
        if (k == 'source_ip_string' || k == 'destination_ip_string') {
          copy[k] = item(); 
        }
        continue;
      }

      if (typeof item == 'object') {
        if (item instanceof Buffer) {
          // noop 
        } else {
          copy[k] = makeJson(item); 
        }
      } else {
        copy[k] = item;
      }
    }
    return copy;
  }

 
}

function EventProcessor(options) {
  var self = this;
  self.options = options;
  Task.call(this, options);
  self.current_event = null;
  self.sensor = options.sensor;
  self._load_metadata();
};

EventProcessor.prototype._load_metadata = function() {
  var self = this;
  // load all 
  self.classifications = new metadata.Classification(self.options.references.classification_file);
  self.signatures = new metadata.SidMsg(self.options.references.sid_file, self.options.references.reference_file);
  self.generators = new metadata.GenMsg(self.options.references.gen_file);
};

EventProcessor.prototype.stop = function() {
  var self = this;
  if (self.watch) {
    clearInterval(self.watch);
    self.watch = null;
  };
};

EventProcessor.prototype.start = function() {
  var self = this;
  if (self.watch) {
    return;
  }
  self.watch = setInterval(function() {
    
    if (self.current_event) {
      // if it's older than 10 seconds, just flush it
      var thirtysecondsago = new Date((new Date()).getTime() - 2 * 1000);
      if (self.current_event.loaded_at < thirtysecondsago 
         || self.current_event.packets.length > 0
         ) {
        self._flush_current_event();
      }
    }
  }, 2 * 1000);
};


EventProcessor.prototype._event_container = function(event) {
  var self = this;

  if (self.current_event && self.current_event.event_id != event.data.event_id) {
    self._flush_current_event();
  } 

  if (self.current_event && self.current_event.event_id) {
   return self.current_event; 
  }

  self.sensor.id = self.sensor.id || event.data.sensor_id;

  var current_event = {
    event_id: event.data.event_id,
    sensor: self.sensor,
    loaded_at: new Date(),
    packets: [],
    // TODO others
  };

  current_event.json = function() {
    return makeJson(current_event);
  };

  self.current_event = current_event;

  return self.current_event;
};


EventProcessor.prototype._add_metadata = function(event) {

  var self = this;
  
  if (!event) {
    return;
  }

  event.generator_id = event.generator_id || 1;

  event.classification = self.classifications.find(event.classification_id);
  event.signature = self.signatures.find(event.signature_id);
  event.generator = self.generators.find(event.generator_id, event.signature_id);

  event.signature = event.signature || { 
    references: [],
    name: 'Snort Alert [' + event.signature_id + ':' + event.generator_id + ':0]'
  };
};

EventProcessor.prototype._preprocess_event_ipv4 = function(event) {
  var self = this;
  
  if (!event) {
    return;
  }

  self._add_metadata(event);

  event.source_ip_string = function() {
    return iplong2str(event.source_ip);
  };
  event.destination_ip_string = function() {
    return iplong2str(event.destination_ip);
  };
};


EventProcessor.prototype._process_ids_event_legacy = function(container, event) {
  var self = this;
  container.event = event.data;
  self._preprocess_event_ipv4(container.event);
};

EventProcessor.prototype._process_ids_event = function(container, event) {
  var self = this;
  container.event = event.data;
  self._preprocess_event_ipv4(container.event);
//  debug("finished processing ids_event_legacy: ", container)
};

EventProcessor.prototype._process_ids_event_ipv6 = function(container, event) {
  var self = this;
  container.event = event.data;
  self._add_metadata(container.event);
  // TODO: others
//  self._preprocess_event_ipv4(container.event);
  // debug("finished processing ids_event_ipv6: ", event)
};


EventProcessor.prototype._process_ids_event_ipv6_legacy = function(container, event) {
  var self = this;
  container.event = event.data;
  self._add_metadata(container.event);
  // TODO: others
  // debug("finished processing ids_event_ipv6_legacy: ", event)
};



EventProcessor.prototype._process_extra = function(container, event) {
  var self = this;

  container.extra = container.extra || [];
  container.extra.push(event)
  // TODO: fix unified2 parser
  // debug("EXTRA", event.extra_string())
};


EventProcessor.prototype._process_packet = function(container, event) {
  var self = this;

  container.packets = container.packets || [];

  container.packets.push({
    raw: event.data,
    packet: event.packet,
    bytes: event.packet_bytes
  })
};

EventProcessor.prototype._flush_current_event = function() {
  var self = this;

  if (self.current_event) {
    self.emit('data', self.current_event);
    self.current_event = null; 
  };
};

EventProcessor.prototype.process = function(event) {
  var self = this;
  
  var container = self._event_container(event);
  
  switch (event.header.type) {

    case typedefs.UNIFIED2_EVENT:
      debug("Received deprecated UNIFIED2_EVENT", event);  
      break;

    case typedefs.UNIFIED2_PACKET:
      // debug("Received UNIFIED2_PACKET", event);  
      self._process_packet(container, event);
      break;

    case typedefs.UNIFIED2_IDS_EVENT_LEGACY:
     // debug("Received UNIFIED2_IDS_EVENT_LEGACY", event);  
      self._process_ids_event_legacy(container, event);
      container.event_type = "UNIFIED2_IDS_EVENT_LEGACY";
      break;

    case typedefs.UNIFIED2_IDS_EVENT_MPLS:
      break;

    case typedefs.UNIFIED2_IDS_EVENT:
      self._process_ids_event(container, event);
    //  debug("Received UNIFIED2_IDS_EVENT");  
      container.event_type = "UNIFIED2_IDS_EVENT";
      break;

    case typedefs.UNIFIED2_IDS_EVENT_IPV6:
      self._process_ids_event_ipv6(container, event);
     // debug("Received UNIFIED2_IDS_EVENT_IPV6");  
      container.event_type = "UNIFIED2_IDS_EVENT_IPV6";
      break;


    case typedefs.UNIFIED2_IDS_EVENT_IPV6_LEGACY:
      self._process_ids_event_ipv6_legacy(container, event);
      //debug("Received UNIFIED2_IDS_EVENT_IPV6");  
      container.event_type = "UNIFIED2_IDS_EVENT_IPV6_LEGACY";
      break;

    case typedefs.UNIFIED2_EXTRA_DATA:
      // debug("Received UNIFIED2_EXTRA_DATA", event);  
      self._process_extra(container, event);
      break;

    default:
      debug("Unknown event: ", event);
  }
};






