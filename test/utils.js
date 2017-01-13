
function renderToString(hbs, template, data) {
  var div  = document.createElement('div');
  var view = typeof template === 'function' ? template : hbs.compile(template);
  view(div, data);
  return div.innerHTML;
}