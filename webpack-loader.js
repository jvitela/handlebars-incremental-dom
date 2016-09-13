'use strict';

// var loaderUtils = require('loader-utils');
var HandlebarsIdom = require('./index.js');

module.exports = function(source) {
  var src  = HandlebarsIdom.compile(source, { asString: true });

  // var query = loaderUtils.parseQuery(this.query);
  this.cacheable && this.cacheable();

  return 'var idom  = require("incremental-dom");' +
         'var hbs   = require("handlebars-incremental-dom/src/HandlebarsRuntime");' + 
         'var view  = ' + src + ';' +
         'var patch = function patch(node, data) { ' +
         '  idom.patch(node, view, data);' +
         '};' +
         'patch.view = view;' +
         'module.exports = patch;';
};