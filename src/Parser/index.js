'use strict';

var mergeOptions = require('parse5/lib/common/merge_options'),
    BaseParser   = require('parse5/lib/parser'),
    Tokenizer    = require('../Tokenizer'),
    TreeAdapter  = require('../TreeAdapter'),
    extend       = require('../Util/extend');

var HTML = require('parse5/lib/common/html');
var NS   = HTML.NAMESPACES;

var DEFAULT_OPTIONS = {
    locationInfo: false,
    treeAdapter: TreeAdapter
};

/**
 * Custom Parser
 * Extends Parse5 Parser
 */
module.exports = extend(BaseParser, {
  constructor: function(options) {
    options = mergeOptions(DEFAULT_OPTIONS, options);
    BaseParser.call(this, options);
  },

  _bootstrap: function (document, fragmentContext) {
    BaseParser.prototype._bootstrap.call(this, document, fragmentContext);
    this.tokenizer = new Tokenizer(this.options);
  },

  _processToken: function(token) {
    if (this.insertionMode === 'IN_BODY_MODE' && token.mustache) {
      this._insertMustache(token, NS.HTML);
    } else {
      BaseParser.prototype._processToken.call(this, token);
    }
  },

  _insertMustache: function (token, namespaceURI) {
    var element = this.treeAdapter.createMustache(token.tagName, token.attrs, namespaceURI, token.selfClosing, token.mustache);
    this._attachElementToTree(element);
    if (!token.selfClosing) {
      this.openElements.push(element);
    }
  },

  // _insertElement: function (token, namespaceURI) {
  //   var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

  //   element.mustache = token.mustache;

  //   this._attachElementToTree(element);
  //   this.openElements.push(element);
  // },

  // _appendElement: function (token, namespaceURI) {
  //   var element = this.treeAdapter.createElement(token.tagName, namespaceURI, token.attrs);

  //   this._attachElementToTree(element);
  // }
});
