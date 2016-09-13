(function(QUnit) {
	var hbs;
	
	QUnit.module('Expressions', {
		beforeEach: function(assert) {
			hbs = window.HandlebarsIncrementalDom;
		}
	});

  QUnit.test('basic', function(assert) {
  	var template = '{{foo}}';
  	var data 		 = {foo:'bar'};
 		assert.expect(1);
		assert.equal('bar', renderToString(hbs, template, data), template);
  });

  QUnit.test('dot-separated path', function(assert) {
    var template = '{{foo.bar}}';
    var data     = {foo:{bar:'candy'}};
    assert.expect(1);
    assert.equal('candy', renderToString(hbs, template, data), template);
  });

  QUnit.test('slash-separated path', function(assert) {
    var template = '{{foo/bar}}';
    var data     = {foo:{bar:'candy'}};
    assert.expect(1);
    assert.equal('candy', renderToString(hbs, template, data), template);
  });

  QUnit.test('segment-literal notation', function(assert) {
    var template, data;
    assert.expect(5);

    template = '{{[€]}}';
    data     = {'€':'euro'};
    assert.equal('euro', renderToString(hbs, template, data), template);

    template = '{{foo.[þ@r]}}';
    data     = {foo:{'þ@r':'candy'}};
    assert.equal('candy', renderToString(hbs, template, data), template);

    template = '{{foo.[/]}}';
    data     = {foo:{'/':'candy'}};
    assert.equal('candy', renderToString(hbs, template, data), template);

    template = '{{foo.[.]}}';
    data     = {foo:{'.':'candy'}};
    assert.equal('candy', renderToString(hbs, template, data), template);

    template = '{{[123]}}';
    data     = {'123':'one-two-three'};
    assert.equal('one-two-three', renderToString(hbs, template, data), template);
  });

  QUnit.test('numeric expressions', function(assert) {
    var template, data;
    assert.expect(6);

    template = '{{123}}';
    data     = {'123': 'OneTwoThree'};
    assert.equal('OneTwoThree', renderToString(hbs, template, data), template);

    template = '{{-123}}';
    data     = {'-123': 'minusOneTwoThree'};
    assert.equal('minusOneTwoThree', renderToString(hbs, template, data), template);

    template = '{{-45.67}}';
    data     = {'-45.67': 'minusFourFiveDotSixSeven'};
    assert.equal('minusFourFiveDotSixSeven', renderToString(hbs, template, data), template);

    template = '{{56.78}}';
    data     = {'56.78': 'FiveSixDotSevenEight'};
    assert.equal('FiveSixDotSevenEight', renderToString(hbs, template, data), template);

    template = '{{56.78.a}}';
    data     = {'56':{'78': {'a':'FiveSixDotSevenEightDotA'} }};
    assert.equal('FiveSixDotSevenEightDotA', renderToString(hbs, template, data), template);

    template = '{{127.0.0.1}}';
    data     = {'127':{'0': {'0':{'1':'localhost'}}}};
    assert.equal('localhost', renderToString(hbs, template, data), template);
  });

})(window.QUnit);