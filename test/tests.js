(function(QUnit) {

	var hbs;
	QUnit.module('Compiler', {
		beforeEach: function(assert) {
			hbs = window.HandlebarsIncrementalDom;
		}
	});

  QUnit.test('is loaded', function(assert) {
    assert.expect(2);
    assert.equal(typeof hbs,         'object',   'is an object.');
    assert.equal(typeof hbs.compile, 'function', 'has a compile method.');
  });

  QUnit.test('can parse static html', function(assert) {
  	var tmpl   = '<p>Hello World</p>';
  	var div    = document.createElement('div');   
  	var render = hbs.compile(tmpl);

    assert.expect(2);
    assert.equal(typeof render, 'function', 'compile returns a function.');

  	render(div);
    assert.equal(tmpl, div.innerHTML);
  });

})(window.QUnit);