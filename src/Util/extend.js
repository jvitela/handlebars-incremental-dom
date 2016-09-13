'use strict';
var _ = require('lodash');

/**
 * This is based in the inheritance function of Backbone
 *
 * To create a class of your own, you extend from the parent function and provide instance properties (protoProps), 
 * as well as optional staticProps to be attached directly to the constructor function.
 * 
 * extend correctly sets up the prototype chain, so subclasses created with extend can be further extended and subclassed as far as you like.
 * 
 */
function extend(parent, protoProps, staticProps) {
  //var parent = this;
  var child;

  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  _.extend(child, parent, staticProps);
  
  child.prototype = _.create(parent.prototype, protoProps);
  child.prototype.constructor = child;

  //child.__super__ = parent.prototype;
  return child;
};

module.exports = extend;