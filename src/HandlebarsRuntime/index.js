var idom = require('incremental-dom');
var isPatching = false;

// function getContext(data, _parent, index, last) {
//   var prnt   = _parent || {};
//   var dta    = data || {};
//   var result = {
//     "id":      dta.id,
//     "root":    prnt.root  || dta, 
//     "data":    data,      // Allow this to be undefined
//     "_parent": _parent    || null, 
//     "_body":   prnt._body || null
//   };

//   if (index !== undefined) {
//     result["key"] = result["index"] = index;

//     if (last !== undefined) {
//       result["first"] = index === 0;
//       result["last"]  = index === last;
//     }
//   }

//   return result;
// }

// function get(path, context, defaultValue) {
//   var val, key, i, l, result = context;
//   for (i = 0, l = path.length; i < l; ++i) {
//     if (result.data === undefined) {
//       break;
//     }
//     key = path[i];
//     switch (key) {
//       case "@root":
//         result = { "data":result.root, "root":result.root };
//         break;
//       case "@parent":
//         result  = result._parent;
//         break;
//       case "@props":
//         result  = result._props;
//         break;
//       case "@this":
//         // Nothing to do
//         break;
//       case "@key":
//         result = getContext(result.key, result);
//         break;
//       case "@index":
//         result = getContext(result.index, result);
//         break;
//       case "@first":
//         result = getContext(result.first, result);
//         break;
//       case "@last":
//         result = getContext(result.last, result);
//         break;
//       default:
//         result = getContext(result.data[key], result);
//         break;
//     }
//   }

//   if (typeof result.data === 'function') {
//     result.data = result.data.bind((result._parent || result.root).data);
//   }

//   return result.data !== undefined ? result.data : defaultValue;
// }

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

  /*
   * @return string The data id or the component id, prefixed.
   */
  // id: function(data, prefix) {
  //   var id = data.id;
  //   return (id !== undefined ? (prefix + ':' + id) : null);
  // },

  // cid: function(data, prefix) {
  //   return data.id !== undefined ? (prefix + ':' + data.id + (data.index !== undefined ? ':' + data.index : '')) : null;
  // },

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

  /*
   * @index
   * @key
   * @first
   * @last
   * @root
   * @parent
   * @this
   */
  // get: function(path, context, def) {
  //   // Check if is a helper
  //   if (path.length === 1 &&
  //       this._helpers.hasOwnProperty(path[0])) {
  //     return this.helper(path[0], context, [], {});
  //   }
  //   return get(path, context, (def !== undefined ? def : ""));
  // },

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
    // var template, options, proxy;

    // tagName = tagName.toLowerCase();
    // options = { '@cid': cid };
    // this._contexts[cid] = parentContext;

    // proxy = this.getComponentProxy(el, tagName, properties, options);
    // if (proxy) {
    //   proxy.render();
    //   return;
    // }

    var template = this._partials[tagName];
    if (!template) {
      throw Error("Component '" + tagName + "' is not defined");
    }
    template(el, properties, options);
  },

  /**
   * Creates the view controller instance if none exists or returns the current one.
   * 
   * @param  object el        The DOM Element associated to the view
   * @param  string tagName   The registered component tag name
   * @param  object props     The properties to set or update into the instance
   * @param  object tmplOpts  The config options for the template
   * 
   * @return object,null  The instance object or null if none
   */
  // getComponentProxy: function(el, tagName, props, tmplOpts) {
  //   return null;
  // },

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
