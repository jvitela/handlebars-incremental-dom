var incrementalDom = require('incremental-dom');
var handlebars     = require('./src/HandlebarsRuntime');
var Serializer     = require('./src/Serializer');
var Parser         = require('./src/Parser');

/**
 * Compile a mustache template into incremental-dom code
 * 
 * @param  string template          The handlebars template.
 * @param  object opts              Configuration options.
 * @param  object opts.serializer   Serializer configuration
 * @param  object opts.idom         Alternative incremental dom instance to use
 * @param  object opts.hbs          Alternative handlebars runtime to use
 * @param  object opts.asString     If true, the function will return an object with the source code instead
 * @param  object opts.name         If given one, the current template will be registered as partial
 * 
 * @return function Returns a function(element, data) that will render the template.
 */
function compile (template, opts) {
  var factory, parser, fragment, serializer, src, idom, hbs;
  opts       = opts || {};
  parser     = new Parser();
  fragment   = parser.parseFragment(template, null);
  serializer = new Serializer(fragment, opts.serializer);
  src        = serializer.serialize();
  idom       = opts.idom || this.idom;
  hbs        = opts.hbs  || this;

  if (opts.asString) {
    return src;
  }

  factory = new Function('hbs', 'idom', 
    src.headers + '\n' + 
    'function update(data) {\n'+ 
      src.main +
    '}\n' +
    'function render(element, data, opts) {\n' +
    '  hbs.patch(element, update, data, opts);\n' +
    '}\n' +
    (src.fragments ? 'hbs.registerFragments(' + src.fragments +');\n' : '') +
    (opts.name     ? 'hbs.registerPartial(\'' + opts.name +'\', render);\n' : '') +
    'return render;'
  );

  return factory(hbs, incrementalDom);
}

handlebars.idom    = incrementalDom;
handlebars.compile = compile;
module.exports = handlebars;