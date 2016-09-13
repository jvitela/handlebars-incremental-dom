(function(QUnit) {
  var hbs;

  QUnit.module('Components', {
    beforeEach: function(assert) {
      hbs = window.HandlebarsIncrementalDom;
    }
  });

  QUnit.test('inline components', function(assert) {
    var component, template, data, result;
    assert.expect(2);

    component = '<div class="alert alert-{{type}}">{{msg}}</div>';
    hbs.registerComponent('my-alert', hbs.compile(component));
    template = '<my-alert type="info" msg={{message}}></my-alert>';
    data     = { message:'Dolor est' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<div class="alert alert-info">Dolor est</div>', template);

    component = '<div class="alert alert-{{type}}">{{msg}}</div>';
    hbs.registerComponent('my-alert', hbs.compile(component));
    template = '<div>Test:<my-alert type="info" msg="Lorem ipsum {{msg}}"></my-alert>:End</div>';
    data     = { msg:'Dolor est' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<div>Test:<div class="alert alert-info">Lorem ipsum Dolor est</div>:End</div>', template);
  });

  QUnit.test('block components', function(assert) {
    var component, template, data, result;
    assert.expect(1);

    component = '<div class="alert alert-{{type}}">{{> @content }}</div>';
    hbs.registerComponent('my-alert', hbs.compile(component));
    template = '<my-alert type={{type}} message={{msg}}><p>{{msg}} {{@props.message}}</p></my-alert>';
    data     = { type:'info', msg:'Dolor est' };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<div class="alert alert-info"><p>Dolor est Dolor est</p></div>', template);
  });

  QUnit.test('nested components', function(assert) {
    var component, template, data, result;
    assert.expect(2);

    component = {
      'my-list': '<ul class={{ list_type }}>{{> @content }}</ul>',
      'my-itm':  '<li class={{ itm_type }}>{{itm_title}}</li>'
    };
    hbs.registerComponent('my-list', hbs.compile(component['my-list']));
    hbs.registerComponent('my-itm',  hbs.compile(component['my-itm']));

    template = '<my-list list_type={{genere}} list_items={{ movies }}>{{#each @props.list_items}}<my-itm itm_type={{ year }} itm_title={{ name }}></my-itm>{{/each}}</my-list>';
    data     = {
      genere: 'action', 
      movies: [{year:2016, name:'Reavenant'}, {year:2015, name:'Fast & Furious 7'}, {year:2017, name:'Warcraft'}] 
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<ul class="action"><li class="2016">Reavenant</li><li class="2015">Fast &amp; Furious 7</li><li class="2017">Warcraft</li></ul>', template);
  

    component = {
      'my-list': '<ul class={{ list_type }}>{{#each list_items}}{{> @content }}{{/each}}</ul>',
      'my-itm':  '<li class={{ itm_type }}>{{ itm_title }}</li>'
    };
    hbs.registerComponent('my-list', hbs.compile(component['my-list']));
    hbs.registerComponent('my-itm',  hbs.compile(component['my-itm']));
    hbs.registerHelper('json',function(data) {
      return JSON.stringify(data);
    });

    template = '<my-list list_type={{genere}} list_items={{ movies }}><my-itm itm_type={{@props.year}} itm_title={{@props.name}}></my-itm></my-list>'; //
    data     = { 
      genere:'action', 
      movies:[{year:2016, name:'Reavenant'}, {year:2015, name:'Fast & Furious 7'}, {year:2017, name:'Warcraft'}] 
    };
    result = renderToString(hbs, template, data);
    assert.equal(result, '<ul class="action"><li class="2016">Reavenant</li><li class="2015">Fast &amp; Furious 7</li><li class="2017">Warcraft</li></ul>', template);

  });

})(window.QUnit); 