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
  	var tmpl = '<p>Hello World</p>';
  	var div  = document.createElement('div');   
  	var view = hbs.compile(tmpl);

    assert.expect(4);
    assert.equal(typeof view,        'object',   'compile returns an object.');    
    assert.equal(typeof view.patch,  'function', 'it has a patch a function.');
    assert.equal(typeof view.update, 'function', 'it has an update function.');

  	view.patch(div);
    assert.equal(tmpl, div.innerHTML);
  });

})(window.QUnit);