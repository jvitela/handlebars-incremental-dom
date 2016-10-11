
function renderToString(hbs, template, data) {
  var div  = document.createElement('div');
  var view = typeof template === 'object' ? template : hbs.compile(template);
  view.patch(div, data);
  return div.innerHTML;
}