(function(QUnit) {
  var hbs;

  QUnit.module('Tags inside elements and element\'s attributes', {
    beforeEach: function(assert) {
      hbs = window.HandlebarsIncrementalDom;
    }
  });

  QUnit.test('if, unless helpers inside elements', function(assert) {
    var template, data, result;
    assert.expect(8);

    template = '<p {{if important class="text-danger"}}>This is a dangerous thing.</p>';
    data     = { important: true };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-danger">This is a dangerous thing.</p>', template);

    template = '<p {{if important class=cls}}>This is a dangerous thing.</p>';
    data     = { important: true, cls:"text-danger" };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-danger">This is a dangerous thing.</p>', template);

    template = '<p class="text-{{if important \'danger\'}}">Lorem ipsum.</p>';
    data     = { important: true };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-danger">Lorem ipsum.</p>', template);

    template = '<p {{unless important class="hidden"}}>Lorem ipsum.</p>';
    data     = { important: false };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="hidden">Lorem ipsum.</p>', template);

    template = '<p {{unless important class=cls}}>Lorem ipsum.</p>';
    data     = { important: false, cls:"hidden" };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="hidden">Lorem ipsum.</p>', template);

    template = '<p class="{{unless important \'hidden\'}}">Lorem ipsum.</p>';
    data     = { important: false };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="hidden">Lorem ipsum.</p>', template);

    template = '<p class="text-{{if important \'danger\'}}{{unless important \'default\'}}">Lorem ipsum.</p>';
    
    data     = { important: true };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-danger">Lorem ipsum.</p>', template);

    data     = { important: false };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-default">Lorem ipsum.</p>', template);
  });

  QUnit.test('dynamic attribute values', function(assert) {
    var template, data, result;
    assert.expect(4);

    template = '<p class={{priority}}>Lorem ipsum.</p>';
    data     = { priority:'text-important' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-important">Lorem ipsum.</p>', template);

    template = '<p class="text-{{priority}}">Lorem ipsum.</p>';
    data     = { priority:'important' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-important">Lorem ipsum.</p>', template);

    template = '<p class="{{prefix}}-important">Lorem ipsum.</p>';
    data     = { prefix:'text' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-important">Lorem ipsum.</p>', template);

    template = '<p class="text-{{type}}-important">Lorem ipsum.</p>';
    data     = { type:'very' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-very-important">Lorem ipsum.</p>', template);
  });

  QUnit.test('helpers in attribute values', function(assert) {
    var template, data, result;
    assert.expect(1);

    hbs.registerHelper('foo', function(val) { return val + '-sic-acmet'; });
    template = '<p class="text-{{foo \'bar\'}}-cupcake">Lorem ipsum.</p>';
    data     = {};
    result = renderToString(hbs, template, data);
    assert.equal(result, '<p class="text-bar-sic-acmet-cupcake">Lorem ipsum.</p>', template);
  });

})(window.QUnit);    