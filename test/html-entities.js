(function(QUnit) {

  var hbs;
  QUnit.module('HTML Entities', {
    beforeEach: function(assert) {
      hbs = window.HandlebarsIncrementalDom;
    }
  });

  QUnit.test('In body', function(assert) {
    assert.expect(6);

    result = renderToString(hbs, '&times;', {});
    assert.equal(result, '×', '&times;');

    result = renderToString(hbs, '&aacute;', {});
    assert.equal(result, 'á', '&aacute;');

    result = renderToString(hbs, '&agrave;', {});
    assert.equal(result, 'à', '&agrave;');

    // This is sort of a special cases where 
    // the browser actually returns the entity instead of the character
 
    result = renderToString(hbs, '-&nbsp;-', {});
    assert.equal(result, '-&nbsp;-', '&nbsp;'); 

    result = renderToString(hbs, '&lt;', {});
    assert.equal(result, '&lt;', '&lt;');

    result = renderToString(hbs, '&gt;', {});
    assert.equal(result, '&gt;', '&gt;');
  });

})(window.QUnit);