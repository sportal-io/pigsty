var debug = require('debug')('threatstack');

module.exports = Task;

function Task() {
  var self = this;
  self.handlers = {} 
};


Task.prototype.emit = function(event, data) {
  var self = this;
  if (self.handlers[event] && typeof self.handlers[event] === 'function') {
    self.handlers[event](data);
  } else {
    debug('[X] No handler for: ', event);
  };
};

Task.prototype.end = function(data) {
  this.emit('end', data);
};


Task.prototype.error = function(data) {
  this.emit('error', data);
};

Task.prototype.on = function(event, handler) {
  this.handlers[event] = handler;
};
