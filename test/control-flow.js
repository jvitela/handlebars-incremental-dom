(function(QUnit) {
  var hbs;

  QUnit.module('Control flow', {
      beforeEach: function(assert) {
          hbs = window.HandlebarsIncrementalDom;
      }
  });

  QUnit.test('if else', function(assert) {
    var template, data;
    assert.expect(16);

    template = 'lorem{{#if foo1}} ipsum{{/if}}';
    data     = {'foo1':false};
    assert.equal('lorem', renderToString(hbs, template, data), template + '(false)');

    template = '{{#if foo1}}{{foo2}}{{/if}}';
    data     = {'foo1':true, 'foo2':'bar'};
    assert.equal('bar', renderToString(hbs, template, data), template + '(true)');

    template = 'lorem{{#if foo2}} ipsum{{/if}}';
    data     = {'foo2':true};
    assert.equal('lorem ipsum', renderToString(hbs, template, data), template + ' (true)');

    template = 'lorem {{#if abcdefg}} candy {{/if}} ipsum';
    data     = undefined;
    assert.equal('lorem  ipsum', renderToString(hbs, template, data), template + '(undefined)');

    template = 'lorem{{#if foo3}} ipsum{{else}} dolor{{/if}}';
    data     = {'foo3':false};
    assert.equal('lorem dolor', renderToString(hbs, template, data), template + '(false)');

    template = 'lorem{{#if foo4}} ipsum{{else}} dolor{{/if}}';
    data     = {'foo4':true};
    assert.equal('lorem ipsum', renderToString(hbs, template, data), template + '(true)');

    template = '{{#if true}}yes{{else}}no{{/if}}';
    assert.equal('yes', renderToString(hbs, template), template);

    template = '{{#if 1}}yes{{else}}no{{/if}}';
    assert.equal('yes', renderToString(hbs, template), template);

    template = '{{#if "TRUE"}}yes{{else}}no{{/if}}';
    assert.equal('yes', renderToString(hbs, template), template);

    template = '{{#if false}}yes{{else}}no{{/if}}';
    assert.equal('no', renderToString(hbs, template), template);    

    template = '{{#if 0}}yes{{else}}no{{/if}}';
    assert.equal('no', renderToString(hbs, template), template);    

    template = '{{#if ""}}yes{{else}}no{{/if}}';
    assert.equal('no', renderToString(hbs, template), template);    

    template = '{{#if -1}}yes{{else}}no{{/if}}';
    assert.equal('yes', renderToString(hbs, template), template);    

    template = '{{#if null}}yes{{else}}no{{/if}}';
    assert.equal('no', renderToString(hbs, template), template);    

    template = '{{#if lorem.ipsum.dolor.est}}yes{{else}}no{{/if}}';
    data     = {lorem:{ipsum:{dolor:{est:true}}}};
    assert.equal('yes', renderToString(hbs, template, data), template + ' (true)');

    template = '{{#if [ß].[!].[$].[&]}}yes{{else}}no{{/if}}';
    data     = {'ß':{'!':{'$':{'&':true}}}};
    assert.equal('yes', renderToString(hbs, template, data), template + ' (true)');

    // template = 'lorem{{#if foo5}}ipsum{{else if foo6}}dolor{{else}}est{{/if}}';
    // data     = {'foo5':false, 'foo6':true};
    // assert.equal('lorem est ', renderToString(hbs, template, data), template + ' (true)');    
  });

  QUnit.test('unless else', function(assert) {
    var template, data;
    assert.expect(16);

    template = 'lorem{{#unless foo1}} ipsum{{/unless}}';
    data     = {'foo1':true};
    assert.equal('lorem', renderToString(hbs, template, data), template + '(true)');

    template = '{{#unless foo1}}{{foo2}}{{/unless}}';
    data     = {'foo1':false, 'foo2':'bar'};
    assert.equal('bar', renderToString(hbs, template, data), template + '(false)');

    template = 'lorem{{#unless foo2}} ipsum{{/unless}}';
    data     = {'foo2':false};
    assert.equal('lorem ipsum', renderToString(hbs, template, data), template + ' (false)');

    template = 'lorem {{#unless abcdefg}} candy {{/unless}} ipsum';
    data     = undefined;
    assert.equal('lorem  candy  ipsum', renderToString(hbs, template, data), template + '(undefined)');

    template = 'lorem{{#unless foo3}} ipsum{{else}} dolor{{/unless}}';
    data     = {'foo3':true};
    assert.equal('lorem dolor', renderToString(hbs, template, data), template + '(true)');

    template = 'lorem{{#unless foo4}} ipsum{{else}} dolor{{/unless}}';
    data     = {'foo4':false};
    assert.equal('lorem ipsum', renderToString(hbs, template, data), template + '(false)');

    template = '{{#unless true}}yes{{else}}no{{/unless}}';
    assert.equal('no', renderToString(hbs, template), template);

    template = '{{#unless 1}}yes{{else}}no{{/unless}}';
    assert.equal('no', renderToString(hbs, template), template);

    template = '{{#unless "TRUE"}}yes{{else}}no{{/unless}}';
    assert.equal('no', renderToString(hbs, template), template);

    template = '{{#unless false}}yes{{else}}no{{/unless}}';
    assert.equal('yes', renderToString(hbs, template), template);    

    template = '{{#unless 0}}yes{{else}}no{{/unless}}';
    assert.equal('yes', renderToString(hbs, template), template);    

    template = '{{#unless ""}}yes{{else}}no{{/unless}}';
    assert.equal('yes', renderToString(hbs, template), template);    

    template = '{{#unless -1}}yes{{else}}no{{/unless}}';
    assert.equal('no', renderToString(hbs, template), template);    

    template = '{{#unless null}}yes{{else}}no{{/unless}}';
    assert.equal('yes', renderToString(hbs, template), template);    

    template = '{{#unless lorem.ipsum.dolor.est}}yes{{else}}no{{/unless}}';
    data     = {lorem:{ipsum:{dolor:{est:false}}}};
    assert.equal('yes', renderToString(hbs, template, data), template + ' (false)');

    template = '{{#unless [ß].[!].[$].[&]}}yes{{else}}no{{/unless}}';
    data     = {'ß':{'!':{'$':{'&':false}}}};
    assert.equal('yes', renderToString(hbs, template, data), template + ' (false)');

    // template = 'lorem{{#unless foo5}}ipsum{{else unless foo6}}dolor{{else}}est{{/unless}}';
    // data     = {'foo5':false, 'foo6':true};
    // assert.equal('lorem est ', renderToString(hbs, template, data), template);    
  });

  QUnit.test('each', function(assert) {
    var template, data;
    //assert.expect(1);

    template = '{{#each items}}{{val}}{{/each}}';
    data     = {'items':[{val:1},{val:2},{val:3}]};
    assert.equal('123', renderToString(hbs, template, data), template);

    template = '{{#each items}}{{this}}{{/each}}';
    data     = {'items':[1,2,3,4,5]};
    assert.equal('12345', renderToString(hbs, template, data), template);

    template = '{{#each items}}{{.}}{{/each}}';
    data     = {'items':[1,2,3,4,5]};
    assert.equal('12345', renderToString(hbs, template, data), template);

    template = '{{#each items}}{{@index}}{{/each}}';
    data     = {'items':[1,2,3,4,5]};
    assert.equal('01234', renderToString(hbs, template, data), template);

    template = '{{#each items}}{{@index}}:{{../msg}}{{/each}}';
    data     = {'msg':'lorem', 'items':[1,2,3,4]};
    assert.equal('0:lorem1:lorem2:lorem3:lorem', renderToString(hbs, template, data), template);

    template = '{{#each projects}}{{#each issues}} {{@root.title}}.{{@../index}}.{{@index}}.{{title}} {{/each}}{{/each}}';
    data     = {
      'title':'Issues',
      'projects':[{
        'issues':[{
          'title':'one'          
        },{
          'title':'two'
        }]
      },{
        'issues':[{
          'title':'uno'          
        },{
          'title':'dos'
        }]
      }]
    };
    assert.equal(' Issues.0.0.one  Issues.0.1.two  Issues.1.0.uno  Issues.1.1.dos ', renderToString(hbs, template, data), template);
  });

})(window.QUnit);  