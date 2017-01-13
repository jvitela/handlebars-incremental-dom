(function(QUnit) {
  var hbs;

  QUnit.module('Block expressions', {
      beforeEach: function(assert) {
        hbs = window.HandlebarsIncrementalDom;
      }
  });

  QUnit.test('truthy values', function(assert) {
    var template, data, result;
    assert.expect(7);

    template = '{{#people}}{{firstName}} {{lastName}}{{/people}}';
    data = {
      people: { firstName: 'John', lastName: 'Doe' }
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (object)');

    data = {
      people:    true,
      firstName: 'John', 
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (true)');

    template = '{{#people}}{{../firstName}} {{../lastName}}{{/people}}';
    data = {
      people:    'yes',
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (string)');

    data = {
      people:    '',
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (empty string)');

    data = {
      people:    1,
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (number positive)');
    
    data = {
      people:    -1,
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (number negative)');

    data = {
      people:    0,
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (number zero)');
  });

  QUnit.test('falsey values', function(assert) {
    var template, data, result;
    assert.expect(3);
    
    template = '{{^people}}{{firstName}} {{lastName}}{{/people}}';
    data = {
      firstName: 'John', 
      lastName: 'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (undefined)');

    data = {
      people:    false,
      firstName: 'John', 
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (false)');

    data = {
      people:    null,
      firstName: 'John',
      lastName:  'Doe'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template + '  (null)');
  });

  QUnit.test('arrays', function(assert) {
    var template, data, result;
    assert.expect(3);

    template = '{{#numbers}}{{this}}{{#unless @last}},{{/unless}}{{/numbers}}';
    data = { numbers: [1,2,3,4,5] };
    result = renderToString(hbs, template, data);
    assert.equal(result, '1,2,3,4,5', template);

    template = '{{#numbers}}{{@index}}{{^@last}},{{/@last}}{{/numbers}}';
    data = { numbers: [1,2,3,4,5] };
    result = renderToString(hbs, template, data);
    assert.equal(renderToString(hbs, template, data), '0,1,2,3,4', template);

    template = '{{#people}}{{firstName}} {{lastName}}, {{/people}}';
    data = {
      people: [
        { firstName: 'Yehuda', lastName: 'Katz'  },
        { firstName: 'Carl', lastName: 'Lerche'  },
        { firstName: 'Alan', lastName: 'Johnson' }
      ]
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'Yehuda Katz, Carl Lerche, Alan Johnson, ', template);
  });

  QUnit.test('objects', function(assert) {
    var template, data, result;
    // assert.expect(1);

    template = '{{#person}}{{firstName}} {{lastName}}{{/person}}';
    data = { person: { firstName: 'John', lastName: 'Doe'  } };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'John Doe', template);

    template = '{{#person}}{{../firstName}} {{../lastName}}{{/person}}';
    data = { 
      person: { firstName: 'John', lastName: 'Doe'  }, 
      firstName: 'Juan', 
      lastName:  'Perez'
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'Juan Perez', template);

    template = '{{#person}}{{this}}{{/person}}';
    data = { person: 'Peter Parker' };
    result = renderToString(hbs, template, data);
    assert.equal(result, 'Peter Parker', template + ' (string)');

    template = '{{#age}}{{this}}{{/age}}';
    data = { age: 25 };
    result = renderToString(hbs, template, data);
    assert.equal(result, '25', template + ' (integer)');

  });

})(window.QUnit);  