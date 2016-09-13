
function renderToString(hbs, template, data) {
  var div    = document.createElement('div');
  var render = typeof template === 'function' ? template : hbs.compile(template);
  render(div, data);
  return div.innerHTML;
}