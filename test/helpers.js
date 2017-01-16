(function(QUnit) {
  var hbs;
  
  /**
   * TODO: Subexpressions {{outer-helper (inner-helper 'abc') 'def'}}
   */
  QUnit.module('Helpers', {
      beforeEach: function(assert) {
        hbs = window.HandlebarsIncrementalDom;
      }
  });

  QUnit.test('init', function(assert) {
    assert.expect(1);
    assert.equal('function', typeof hbs.registerHelper, 'registerHelper is available');
  });

  QUnit.test('no arguments', function(assert) {
    var template, data;
    assert.expect(1);

    hbs.registerHelper('helper', function() { return 'candy'; });
    template = '{{helper}}';
    data     = {'helper':'bar'};
    assert.equal('candy', renderToString(hbs, template, data), template);
  });

  QUnit.test('value arguments', function(assert) {
    var template, data;
    assert.expect(5);

    hbs.registerHelper('greet-helper', function(salutation, subject) { return salutation + ' ' + subject; });
    
    template = '{{greet-helper foo bar}}';
    data     = {'foo':'hello', 'bar':'world'};
    assert.equal('hello world', renderToString(hbs, template, data), template);

    template = '{{greet-helper "hola" "mundo"}}';
    assert.equal('hola mundo', renderToString(hbs, template), template);

    template = '{{greet-helper "h!" "€uro"}}';
    assert.equal('h! €uro', renderToString(hbs, template), template);

    template = '{{greet-helper 12 34}}';
    assert.equal('12 34', renderToString(hbs, template), template);

    template = '{{greet-helper [h!] [€uro]}}';
    data     = {'h!':'hello', '€uro':'euro'}
    assert.equal('hello euro', renderToString(hbs, template, data), template);
  });

  QUnit.test('hash arguments', function(assert) {
    var template, data;
    assert.expect(4);

    hbs.registerHelper('greet-helper', function(opts) { return opts.hash.salutation + ' ' + opts.hash.subject; });
    
    template = '{{greet-helper salutation=foo subject=bar}}';
    data     = {'foo':'hello', 'bar':'world'};
    assert.equal('hello world', renderToString(hbs, template, data), template);    

    template = '{{greet-helper salutation="hola" subject="mundo"}}';
    assert.equal('hola mundo', renderToString(hbs, template), template);

    template = '{{greet-helper salutation=123 subject=456}}';
    assert.equal('123 456', renderToString(hbs, template), template);

    template = '{{greet-helper salutation=[h!] subject=[\\\/\\\/*rLd]}}';
    data     = {'h!': 'hello', '\\\/\\\/*rLd': 'world'};
    assert.equal('hello world', renderToString(hbs, template, data), template);    
  });

  QUnit.test('block helpers', function(assert) {
    var template, data;
    assert.expect(3);

    hbs.registerHelper('noop', function(options) {
      var sep = options.hash.separator || '###';
      this.body = sep + this.body + sep;
      return options.fn(this);
    });

    template = '{{#noop}}{{body}}{{/noop}}';
    data     = {body:'Hello World'};
    assert.equal('###Hello World###', renderToString(hbs, template, data), template);

    template = '{{#noop separator="---"}}{{body}}{{/noop}}';
    data     = {body:'Hello World'};
    assert.equal('---Hello World---', renderToString(hbs, template, data), template);

    template = '{{#noop separator=foo}}{{body}}{{/noop}}';
    data     = {body:'Hello World', foo:'**'};
    assert.equal('**Hello World**', renderToString(hbs, template, data), template);
  });

  QUnit.test('helper precedence', function(assert) {
    var template, data;
    assert.expect(2);

    hbs.registerHelper('foo', function(options) {
      return 'bar';
    });

    template = '{{foo}}';
    data     = {foo:'candy'};
    assert.equal('bar', renderToString(hbs, template, data), template);

    template = '{{./foo}}';
    assert.equal('candy', renderToString(hbs, template, data), template);    
  });

})(window.QUnit);