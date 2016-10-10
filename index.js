var idom       = require('incremental-dom'),
    hbs        = require('./src/HandlebarsRuntime'),
    Serializer = require('./src/Serializer'),
    Parser     = require('./src/Parser');

module.exports = {
  handlebars:     hbs,
  incrementalDom: idom,

  /**
   * Compile a mustache template into incremental-dom code
   * @param  string template  The handlebars template.
   * @param  object opts      Configuration options.
   * @return function         Returns a function(element, data) that will render the template.
   */
  compile: function(template, opts) {
    opts = opts || {};
    var patch, updt, factory, fragments;
    var parser     = new Parser();
    var fragment   = parser.parseFragment(template, null);
    var serializer = new Serializer(fragment);
    var src        = serializer.serialize();

    if (opts.asString) {
      return src;
    }

    factory   = new Function("idom", "hbs", "return function(data) { " + src.main + " }");
    updt      = factory(idom, hbs);

    if (src.fragments) {
      fragments = new Function("idom", "hbs", "return " + src.fragments + ";");
      hbs.registerFragments(fragments(idom, hbs));
    }

    patch = function(node, data) { idom.patch(node, updt, data); };

    return {"patch": patch, "update": updt};
  }
}
