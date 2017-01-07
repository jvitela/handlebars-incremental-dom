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

  return 'module.exports = function(idom, hbs) {' +
         '  this.idom   = idom;' +
         '  this.hbs    = hbs;' +
         '  this.update = function(data) {' + src.main + ';};' +
         '  this.patch  = function patch(node, data) {' +
         '    idom.patch(node, this.update, data);' +
         '  };' +
         (src.fragments ? ('  fragments && hbs.registerFragments(' + src.fragments + ');') : '') +
         '  hbs.registerPartial("' + path + '", this);' +
         '};';
};