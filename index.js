var idom       = require('incremental-dom'),
    hbs        = require('./src/HandlebarsRuntime'),
    Serializer = require('./src/Serializer'),
    Parser     = require('./src/Parser');

module.exports = {
  registerComponent: function() {
    hbs.registerComponent.apply(hbs, arguments);
  },

  registerHelper: function() {
    hbs.registerHelper.apply(hbs, arguments);
  },

  registerPartial: function() {
    hbs.registerPartial.apply(hbs, arguments);
  },

  /**
   * Compile a mustache template into incremental-dom code
   * @param  string template  The handlebars template.
   * @param  object opts      Configuration options.
   * @return function         Returns a function(element, data) that will render the template.
   */
  compile: function(template, opts) {
    opts = opts || {};
    var patch, view, factory;
    var parser     = new Parser();
    var fragment   = parser.parseFragment(template, null);
    var serializer = new Serializer(fragment);
    var src        = serializer.serialize();

    if (opts.asString) {
      return 'function(data) { ' + src + ' };';
    }

    factory = new Function("idom", "hbs", "return function(data) { " +src + " }");
    view    = factory(idom, hbs);

    patch = function(node, data) { idom.patch(node, view, data); };
    patch.view = view;

    return patch;
  }
}
