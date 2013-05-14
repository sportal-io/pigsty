var unified2 = require('unified2');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('pigsty');
var typedefs = unified2.definitions.typedefs;

function EventProcessor(options) {
  var self = this;
  self.next = options.next;
  self.sensor_lookup = options.sensor_lookup;
  self.current_event = {};
};

EventProcessor.prototype.aggregate = function() {
  var self = this;


};

EventProcessor.prototype._event_container = function(event) {
  var self = this;

  if (self.current_event && self.current_event.event_id != event.data.event_id) {
    self._flush_current_event();
  } 

  if (self.current_event && self.current_event.event_id) {
   return self.current_event; 
  }

  return {
    event_id: event.data.event_id,
    sensor: self.sensor_lookup(event.data.sensor_id)
    // TODO others
  };
};

EventProcessor.prototype._process_ids_event = function(event) {
  var self = this;
  var container = self._event_container(event);
   

};

EventProcessor.prototype._process_packet = function(event) {
  var self = this;

};

EventProcessor.prototype._flush_current_event = function() {
  var self = this;

  if (self.current_event) {
    self.next(self.current_event);
    self.current_event = null; 
  }

};

EventProcessor.prototype.process = function(event) {
  var self = this;

  debug("received data: ", event);

  if (self.current_event && event.header && event.header.event_id != self.current_event.event_id) {
    self._flush_current_event(); 
  };
  
  switch (event.header.type) {

    case typedefs.UNIFIED2_EVENT:
      debug("Received deprecated UNIFIED2_EVENT");  
      break;

    case typedefs.UNIFIED2_PACKET:
      self._process_packet(event);
      break;

    case typedefs.UNIFIED2_IDS_EVENT_LEGACY:
      break;

    case typedefs.UNIFIED2_IDS_EVENT_MPLS:
      break;

    case typedefs.UNIFIED2_IDS_EVENT:
      break;

    case typedefs.UNIFIED2_IDS_EVENT_IPV6:
      break;

    case typedefs.UNIFIED2_EXTRA_DATA:
      break;

    default:
      debug("Unknown event: ", event);
  }
};






