function getContext(data, _parent, index, last) {
  var result = { 
    "id":      (data && data.id), 
    "root":    _parent.root, 
    "_parent": _parent, 
    "_body":   _parent._body,
    "data":    data 
  };

  if (index !== undefined) {
    result["key"] = result["index"] = index;

    if (last !== undefined) {
      result["first"] = index === 0;
      result["last"]  = index === last;
    }
  }

  return result;
}

function get(path, context, defaultValue) {
  var val, key, i, l, result = context;
  for (i = 0, l = path.length; i < l; ++i) {
    if (result.data === undefined) {
      break;
    }
    key = path[i];
    switch (key) {
      case "@root":
        result = { "data":result.root, "root":result.root };
        break;
      case "@parent":
        result  = result._parent;
        break;
      case "@props":
        result  = result._props;
        break;
      case "@this":
        // Nothing to do
        break;
      case "@key":
        result = getContext(result.key, result);
        break;
      case "@index":
        result = getContext(result.index, result);
        break;
      case "@first":
        result = getContext(result.first, result);
        break;
      case "@last":
        result = getContext(result.last, result);
        break;
      default:
        result = getContext(result.data[key], result);
        break;
    }
  }
  return result.data !== undefined ? result.data : defaultValue;
}

module.exports = {
  _helpers: {},
  _components: {},
  _partials: {},

  context: function(data, _parent, index, last) {
    return getContext(data, _parent, index, last);
  },

  id: function(data, prefix) {
    return data.id !== undefined ? (prefix + ':' + data.id) : null;
  },

  /**
   * @index
   * @key
   * @first
   * @last
   * @root
   * @parent
   * @this
   */
  get: function(path, context, def) {
    // Check if is a helper
    if (path.length === 1 &&
        this._helpers.hasOwnProperty(path[0])) {
      return this.helper(path[0], context, [], {});
    }
    return get(path, context, (def !== undefined ? def : ""));
  },

  helper: function(name, context, values, props, tmpl) {
    var that = this, args = values.slice(); // copy the array
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

  block: function(context, path, vals, hash, tmpl) {
    var items, i, l;

    if (path.length === 1 &&
        this._helpers.hasOwnProperty(path[0])) {
      return this.helper(path[0], context, [], {}, tmpl);
    }

    items = this.get(path, context, null);
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

  component: function(tagName, data, props, tmpl) { //, idom) {
    var context;
    if (typeof this._components[tagName] === 'function') {
      context = this.context(props, data);
      context._body = tmpl;
      this._components[tagName](context); //, idom, this);
    }
  },

  partial: function(name, data) { //, idom) {
    var context, props;
    // Special case for components
    if (name === '@content' && typeof data._body === "function") {
      // The components content is always executed in the parent's context
      context = data._parent;
      props   = data._props;
      context._props = data; // TODO: check if we need to clone
      data._body(context); //, idom, this);
      data._props = props;
    }
    else if (typeof this._partials[name] === "function") { 
      this._partials[name](data); //, idom, this);
    }
  },

  registerComponent: function(tagName, fn) {
    this._components[tagName] = fn && fn.view;
  },

  registerHelper: function(name, fn) {
   this._helpers[name] = fn;
  },

  registerPartial: function(name, fn) {
   this._partials[name] = fn && fn.view;
  }
};
