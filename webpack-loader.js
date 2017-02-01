'use strict';

// var loaderUtils = require('loader-utils');
var HandlebarsIdom = require('./index.js');

/**
 * Precompiles the templates and register the fragments and partials
 */
module.exports = function(source) {
  var path, src  = HandlebarsIdom.compile(source, { asString: true });

  // var query = loaderUtils.parseQuery(this.query);
  this.cacheable && this.cacheable();
  // Get the filename
  path = this.resourcePath.split("/").pop().split(".")[0]; // /^([^\/]+\/)+([^\/]+)\.hbs$/g

  return '' +
  'var hbsidom = require("handlebars-incremental-dom/runtime");'+
  'var hbs  = hbsidom.handlebars;' +
  'var idom = hbsidom.incrementalDOM;'+
  src.headers + '\n' + 
  'function update(data) {'+ 
    src.main +
  '}' +
  'function render(element, data, opts) {' +
  '  hbs.patch(element, update, data, opts);'+
  '}' +
  (src.fragments ? 'hbs.registerFragments(' + src.fragments +');' : '') +
  'hbs.registerPartial("' + path +'", render);' +
  'module.exports = render;';
};