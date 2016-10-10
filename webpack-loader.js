'use strict';

// var loaderUtils = require('loader-utils');
var HandlebarsIdom = require('./index.js');

module.exports = function(source) {
  var path, src  = HandlebarsIdom.compile(source, { asString: true });

  // var query = loaderUtils.parseQuery(this.query);
  this.cacheable && this.cacheable();
  // Get the filename
  path = this.resourcePath.split("/").pop().split(".")[0]; // /^([^\/]+\/)+([^\/]+)\.hbs$/g

  return 'var idom  = require("incremental-dom");' +
         'var hbs   = require("handlebars-incremental-dom/src/HandlebarsRuntime");' + 
         'var updt  = function(data) {' + src.main + ';};' +
         'var patch = function patch(node, data) {' +
         '  idom.patch(node, updt, data);' +
         '};' +
         'var part = {"patch": patch, "update": updt};' + 
         (src.fragments ? 'hbs.registerFragments(' + src.fragments + ');' : '') + 
         'hbs.registerPartial("' + path + '", part);' + 
         'module.exports = part;';
};