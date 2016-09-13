(function(QUnit) {
  var hbs;

  QUnit.module('Partials', {
    beforeEach: function(assert) {
      hbs = window.HandlebarsIncrementalDom;
    }
  });

  QUnit.test('static content', function(assert) {
    var template, partial, data, result;
    assert.expect(3);

    template = '<p>{{>hello}}</p>';
    partial  = 'Hello World';
    data     = {};
    hbs.registerPartial('hello', hbs.compile(partial));
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p>Hello World</p>', template + ', ' + partial);

    template = '<p>{{>hello}}</p>';
    partial  = '<em>Hello World</em>';
    data     = {};
    hbs.registerPartial('hello', hbs.compile(partial));
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p><em>Hello World</em></p>', template + ', ' + partial);

    template = '<p>{{>hello}} {{>subj}}</p>';
    partial = [];
    partial.push('<em>Hello</em>');
    partial.push('World');
    data = {};
    hbs.registerPartial('hello', hbs.compile(partial[0]));
    hbs.registerPartial('subj',  hbs.compile(partial[1]));
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p><em>Hello</em> World</p>', template + ', ' + partial.join(', '));

  });

  QUnit.test('with same context', function(assert) {
    var template, partial, data, result;
    assert.expect(2);

    template = '<p>{{>hello}}</p>';
    partial  = 'Hello {{msg}}';
    data     = { msg: 'World!'};
    hbs.registerPartial('hello', hbs.compile(partial));
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p>Hello World!</p>', template + ', ' + partial);


    template = '{{#alert}}<p>{{>hello}}</p>{{/alert}}';
    partial  = 'Hello {{msg}}';
    data = { 
      msg: 'World!', 
      alert: { msg: 'Mundo!' }
    };
    hbs.registerPartial('hello', hbs.compile(partial));
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p>Hello Mundo!</p>', template + ', ' + partial);    
  });

  QUnit.test('recursive', function(assert) {
    var tmpl, template, partial, data, result;
    assert.expect(1);

    template = '{{#data}}<p>{{msg}}</p>{{>next}}{{/data}}{{^data}}<p>End</p>{{/data}}';
    tmpl = hbs.compile(template);
    data = { data:{msg:'Hello', data:{ msg:'World', data:{ msg:'This is me'} } } };
    hbs.registerPartial('next', tmpl);
    result = renderToString(hbs, tmpl, data);
    assert.equal(result, '<p>Hello</p><p>World</p><p>This is me</p><p>End</p>', template);
  });

})(window.QUnit);    