var idom = require('incremental-dom');
var isPatching = false;

module.exports = {
  _helpers:    {},
  _partials:   {},
  _fragments:  {},
  _contexts:   {},

  context: function(data, _parent, index, last) {
    // return getContext(data, _parent, index, last);
    var prnt   = _parent || {};
    var dta    = data || {};
    var result = {
      "id":      dta.id,
      "root":    prnt.root  || {data: data}, 
      "data":    data,      // Allow this to be undefined
      "_parent": _parent    || null, 
      "_body":   prnt._body || null
    };

    if (index !== undefined) {
      result["key"] = result["index"] = index;

      if (last !== undefined) {
        result["first"] = index === 0;
        result["last"]  = index === last;
      }
    }

    return result;
  },

  patch: function(element, update, data, options) {
    var cid, ctx;
    options = options || {};
    cid     = options['@cid'];
    ctx     = this._contexts[cid];

    if (ctx) {
      data = this.context(data, ctx);
      data._body = this._fragments[cid];
    }

    if (isPatching) {
      update(data);
    }
    else if(element) {
      isPatching = true;
      idom.patch(element, update, data);
      isPatching = false;
    }
  },

  helper: function(name, context, values, props, tmpl) {
    var that = this, args = values.slice(); // copy the array
    if (!this._helpers[name]) {
      throw Error("Helper '" + name + "' is not defined");
    }
    args.push({
      name: name,
      hash: props,
      data: context,
      fn:   function(dta) { tmpl(that.context(dta, context)); }
    });
    return this._helpers[name].apply(context.data, args);
  },

  each: function(context, items, tmpl) {
    var i, l, itemContext;
    if (!Array.isArray(items)) {
      return;
    }
    for (i = 0, l = items.length; i < l; ++i) {
      itemContext = this.context(items[i], context, i, (l - 1));
      tmpl(itemContext);
    }
  },

  block: function(context, items, vals, hash, tmpl) {
    var i, l;
    
    if (typeof items === "function") {
      items = items(context, tmpl);
    }

    // items = this.get(path, context, null);
    if (Array.isArray(items)) {
      this.each(context, items, tmpl);
    }
    else if (typeof items === 'boolean' && items === true) {
      tmpl(context);
    }
    else if (items !== null && items !== undefined) {
      tmpl(this.context(items, context));
    }
  },

  /**
   * Handles the behaviour for components
   * @param  object el    The DOM Element to be updated
   * @param  string cid   The Component's instance cid
   * @param  object data  The parent Context
   * @param  object props The properties to be updated in the component
   */
  component: function(el, tagName, cid, parentContext, properties) {
    // idom.skip();
    // // Defer the actuar rendering as this might trigger new renders for custom components
    // Renderer.addTask(cid, this, [el, tagName, cid, parentContext, properties]);
    var options = { '@cid': cid };
    tagName = tagName.toLowerCase();
    this._contexts[cid] = parentContext;
    this.renderComponent(el, tagName, properties, options);
  },

  renderComponent: function(el, tagName, properties, options) {
    var template = this._partials[tagName];
    if (!template) {
      throw Error("Component '" + tagName + "' is not defined");
    }
    template(el, properties, options);
  },

  partial: function(name, data) {
    var context, props;

    // Special case for components
    if (name === '@content' && typeof data._body === "function") {
      // The components content is always executed in the parent's context
      context = data._parent;
      props   = data._props;  // Store previous _props 
      context._props = data;  // TODO: check if we need to clone
      data._body(context);    // Call the body partial
      data._props = props;    // Restore the previous _props
    }
    else if (typeof this._partials[name] === "function") {
      this._partials[name](null, data); // Execute the partial
    }
  },

  registerFragments: function(fragments) {
    var key;
    for (key in fragments) {
      if (!fragments.hasOwnProperty(key)) {
        continue;
      }
      this._fragments[key] = fragments[key];
    }
  },

  registerHelper: function(name, fn) {
   this._helpers[name] = fn;
  },

  registerPartial: function(name, fn) {
   this._partials[name] = fn;
  }
};
