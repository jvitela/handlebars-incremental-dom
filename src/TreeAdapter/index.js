'use strict';

var BaseTreeAdapter = require('parse5/lib/tree_adapters/default'),
    TMUSTACHE       = require('../Util/mustache-types');

/**
 * Custom TreeAdapter.
 * Extends the tree adaptef from Parse5
 */
var IdomHbsTreeAdapter = BaseTreeAdapter;

IdomHbsTreeAdapter.createMustache = function(tagName, attrs, namespaceURI, selfClosing, mustache) {
  return {
    nodeName:     tagName,
    tagName:      tagName,
    attrs:        attrs,
    namespaceURI: namespaceURI,
    childNodes:   [],
    mustache:     mustache,
    selfClosing:  selfClosing,
    parentNode:   null
  };
}

IdomHbsTreeAdapter.isMustacheNode = function(node) {
  return node.hasOwnProperty("mustache");
}

IdomHbsTreeAdapter.isMustacheTextNode = function(node) {
  return (node.hasOwnProperty("mustache") &&
          node.mustache.type     === TMUSTACHE.TAG &&
          node.mustache.location === 'body');
}

IdomHbsTreeAdapter.getMustachePath = function(node) {
  return node.mustache.path;
}

// We asume all elements with a dash in between are custom components
IdomHbsTreeAdapter.isWebComponent = function(node) {
  return (node.hasOwnProperty("tagName") && node.tagName.indexOf("-") > 0);
}

module.exports = IdomHbsTreeAdapter;
