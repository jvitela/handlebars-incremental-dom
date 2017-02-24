'use strict';

var parse5       = require('parse5'),
    TMUSTACHE    = require('../Util/mustache-types'),
    TreeAdapter  = require('../TreeAdapter'),
    doctype      = require('parse5/lib/common/doctype'),
    mergeOptions = require('parse5/lib/common/merge_options'),
    HTML         = require('parse5/lib/common/html'),
    Lodash       = require('lodash'),
    SourceMap    = require('source-map');

var _ = Lodash;

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

//Default serializer options
/**
 * @typedef {Object} SerializerOptions
 *
 * @property {TreeAdapter} [treeAdapter=parse5.treeAdapters.default] - Specifies input tree format.
 */
var DEFAULT_OPTIONS = {
    treeAdapter:            TreeAdapter,
    renderComponentWrapper: true,
    sourceName: 'unknown.js'
};

//Escaping regexes
var AMP_REGEX = /&/g,
    NBSP_REGEX = /\u00a0/g,
    DOUBLE_QUOTE_REGEX = /"/g,
    LT_REGEX = /</g,
    GT_REGEX = />/g;

//Serializer
var Serializer = module.exports = function (node, options) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options);
    this.treeAdapter = this.options.treeAdapter;

    this.html = '';
    this.startNode = node;
    this.mustacheStack = [];
    this.elemCount = 0;
    this.components = [];
    this.constAttrs = [];
    this.location = { line:1, column:1 };
};

// NOTE: exported as static method for the testing purposes
Serializer.escapeString = function (str, attrMode) {
  return str || '';
};

//API
Serializer.prototype.serialize = function () {
  var childNodes = this.treeAdapter.getChildNodes(this.startNode);
  if (!childNodes) {
    return '';
  }

  this.srcMapGen = new SourceMap.SourceMapGenerator({ file: this.options.sourceName });
  this.location = { line:1, column:1 };

  this.id = Date.now().toString(36); // Generate a small id
  this.elemCount  = 0;
  this.constAttrs = [];
  this.headers = '';
  this.html = 'var val, stack1, context;\n';
  this.html += "context = (data && data.root) ? data : { 'id': (data && data.id), 'data': data, 'root': {data:data} };\n";
  this._serializeChildNodes(childNodes);

  var components = _.map(this.components, function(cmp) { return '"' + cmp.id + '": ' + cmp.fn });

  if (this.constAttrs.length) {
    this.headers += 'var attrs = [' + this.constAttrs.join(',') + ']';
  }

  return {
    'headers':   this.headers,
    'fragments': components.length ? ('{\n' + components.join(',\n') + '\n}') : null,
    'main':      this.html,
    'map':       this.srcMapGen.toString()
  };
};

//Internals
Serializer.prototype._getId = function(tn) {
  var id = tn + ':' + this.id + ':' + (++this.elemCount);
  // return 'hbs.id(context, "' + id + '")';
  return '(context.id !== undefined ? ("' + id + ':" + context.id) : null)';
};

Serializer.prototype._getComponentId = function(tn) {
  return  (tn + ':' + this.id + ':' + (this.components.length + 1));
}

Serializer.prototype._addComponentContentTemplate = function(id, childNodes) {
  var html  = this.html;
  this.html = 'function(context) {\n';
  this._serializeChildNodes(childNodes);
  this.html += '}';
  this.components.push({ id:id, fn:this.html });
  this.html = html;
}

Serializer.prototype._buildParsingError = function(msg, token) {
  var err = new SyntaxError(msg);
  err.lineNumber   = this.location.line;
  err.columnNumber = this.location.column;
  err.lineStr      = "";
  return err;
};


Serializer.prototype._serializeChildNodes = function (childNodes) {
  var i, l, location, currentNode, textNodes = [];

  if (!childNodes) {
    return;
  }

  for (i = 0, l = childNodes.length; i < l; i++) {
    currentNode = childNodes[i];
    location = currentNode.__locationInfo || {};

    // TODO: isMustacheTextHelper
    if (this.treeAdapter.isTextNode(currentNode) || 
        this.treeAdapter.isMustacheTextNode(currentNode)) {
      textNodes.push(currentNode);
      continue;
    }

    if (textNodes.length) {
      this._serializeTextNodes(textNodes);
      textNodes = [];
    }

    if (this.treeAdapter.isMustacheNode(currentNode)) {
      this._serializeMustacheTag(currentNode);
    }

    else if (this.treeAdapter.isWebComponent(currentNode)) {
      this._serializeWebComponent(currentNode);
    }

    else if (this.treeAdapter.isElementNode(currentNode)) {
      this._serializeElement(currentNode);
    }
  }

  if (textNodes.length) {
    this._serializeTextNodes(textNodes);
  }  
};

Serializer.prototype._serializeMustacheTag = function (node) {
  var lastTag, inlineHelpers, childNodesHolder, childNodes, name, tn = this.treeAdapter.getTagName(node);

  inlineHelpers = ['if', 'unless'];
  name = '"' + tn + '"';

  if (!node.selfClosing) {
    this._serializeMustacheBlock(tn, node);
  }

  else if (node.mustache.type === TMUSTACHE.BLOCK_ELSE) {
    lastTag = _.last(this.mustacheStack);
    if (lastTag && lastTag.tn !== 'if' && lastTag.tn !== 'unless') {
      throw this._buildParsingError("Found 'else' after " + lastTag.tn);
    }
    this.html += '} else {\n';
  }

  else if (node.mustache.type === TMUSTACHE.HELPER) {
    if (node.mustache.location === 'body') {
      this.html += 'idom.text(hbs.helper(' + name + ', context, ';
      this._serializeMustacheAttrs(node);
      this.html += '));\n';
    } 
    else if (node.mustache.location === 'element') {
      switch (tn) {
        // case 'attr':
        //   this._serializeMustacheHelperAttr(node);
        //   break;
        case 'if':
          this._serializeMustacheAttrIfHelper(node);
          break;
        case 'unless':
          this._serializeMustacheAttrUnlessHelper(node);
          break;
        default:
          throw this._buildParsingError("Helpers are not allowed inside elements, found helper '" + tn + "'");
          break;
      }
    }
    else {
      switch (tn) {
        case 'if':
          this._serializeMustacheAttrValIfHelper(node);
          break;
        
        case 'unless':
          this._serializeMustacheAttrValIfHelper(node, true);
          break;

        default: 
          this.html += 'hbs.helper(' + name + ', context, ';
          this._serializeMustacheAttrs(node);
          this.html += ')';
          break;        
      }
    }
  }

  else if (node.mustache.type == TMUSTACHE.BLOCK_CLOSE) {
    lastTag = this.mustacheStack.pop();
    // this.mustacheStack.length &&
    if (!lastTag || tn !== lastTag.tn) {
      throw this._buildParsingError("Found closing tag for '" + tn + "' while expecting '" + lastTag.tn + "'");
    }
    if (lastTag.node.mustache.type == TMUSTACHE.BLOCK_INV_OPEN) {
      this.html += '}\n';  
    }
    else if (node.mustache.location === 'body') {
      this.html += inlineHelpers.indexOf(tn) === -1 ? '});\n' : '}\n';
    } 
    else {
      this.html += inlineHelpers.indexOf(tn) === -1 ? '})' : '';
    }
  }

  else if (node.mustache.type == TMUSTACHE.PARTIAL) {
    this.html += 'hbs.partial("' + tn + '", context);\n';
  }

  else { // TMUSTACHE.TAG
    this._serializeMustacheExpr(node.mustache.path, node.mustache.special);
  }

  childNodesHolder = (tn === $.TEMPLATE && ns === NS.HTML) ? this.treeAdapter.getTemplateContent(node) : node;
  childNodes = this.treeAdapter.getChildNodes(childNodesHolder);
  this._serializeChildNodes(childNodes);

  if (node.__location) {
    this.srcMapGen.addMapping({
      generated: {
        line:   this.location.line++,
        column: this.location.column
      },
      source: this.options.sourceName,
      original: {
        line:   node.__location.line,
        column: node.__location.col
      },
      name: tn
    });    
  }
}

/*

    {{lorem.ipsum.dolor}}
    a0: stack1 = data
    a1: (a0) != null ? stack1.lorem : stack1
    a2: stack1 = (a1)
    b0: (a2) != null ? stack1.ipsum : stack1
    b1: stack1 = (b0)
    c0: (b1) != null ? stack1.dolor : stack1


    {{../foo.bar}}
    a0: stack1 = ctx.parent
    a1: (a0) != null ? stack1.data : stack1
    b0: stack1 = (a1)
    b1: (b0) != null ? stack1.foo  : stack1
    c0: stack1 = (b1)
    c1: (c0) != null ? stack1.bar : stack1


    {{../../foo.bar}}
    a0: stack1 = ctx.parent
    a1: (a0) != null ? stack1.parent : stack1
    b0: stack1 = (a1)
    b1: (b0) != null ? stack1.data : stack1
    c0: stack1 = (b1)
    c1: (c0) != null ? stack1.foo  : stack1
    d0: stack1 = (c1)
    d1: (d0) != null ? stack1.bar : stack1

*/
Serializer.prototype._serializeMustacheExpr = function(path, def, hlprAsFn) {
  var i = 0, l = path.length, hpr, key, prev, step = false;

  hpr = (l === 1 && path[0][0] !== '@') ? path[0] : false; // Check for helper
  def = JSON.stringify(def !== undefined ? def : ''); // fallback value

  // Search where the context should change to data
  while (i < l && path[i][0]==='@') { 
    if (path[i] == '@this') {
      i = l;
      break;
    }
    ++i;
  }
  // and insert an special @data step into the path
  if (i < l) {
    path.splice(i, 0, '@data');
    ++l;
  }

  // Iterate the path
  for (i = 0; i < l; ++i) {
    key  = path[i];
    prev = step;

    switch  (key) {
      case "@this":
      case "@data":
        step = '.data';
        break;
      case "@root":
        step = '.root';
        break;
      case "@parent":
        step = '._parent';
        break;
      case "@props":
        step = '._props';
        break;
      case "@key":
        step = '.key';
        break;
      case "@index":
        step = '.index';
        break;
      case "@first":
        step = '.first';
        break;
      case "@last":
        step = '.last';
        break;
      default:
        step = '[' + JSON.stringify(key) + ']';
        break;
    }
    // Add the result
    if (prev === false) {
      step = 'stack1 = context' + step;
    } else {
      step = '(' + prev + ') != null ? stack1' + step + ' : stack1';
    }
    // if there is a next step
    if ((i+1) < l) {
      step = 'stack1 = (' + step + ')';
    }
  }

  step = '(stack1 = (' + step + ')) !== undefined ? stack1 : ' + def;

  // Check if the expression is a helper
  if (hpr !== false) {
    hpr  = JSON.stringify(hpr);

    // Special case where we need to delay the execution of the helper
    if (hlprAsFn === true) {
      step = 'typeof hbs._helpers[' + hpr + '] === "function" ? ' +
             '(function(context, tmpl) { hbs.helper(' + hpr + ', context, [], {}, tmpl) }) : ' +
             '(' + step + ')';
    }
    else {
      step = 'typeof hbs._helpers[' + hpr + '] === "function" ? ' +
             'hbs.helper(' + hpr + ', context, [], {}) : ' +
             '(' + step + ')';
    }
  }

  this.html += '(' + step + ')';
}

/**
 * Serialize Web Component
 * @param  object node The AST node to serialize
 */
Serializer.prototype._serializeWebComponent = function (node) {
  var tn         = this.treeAdapter.getTagName(node),
      attrs      = this.treeAdapter.getAttrList(node),
      childNodes = this.treeAdapter.getChildNodes(node);

  var grpAttrs = this._groupAttrsByType(attrs);
  var cid      = this._getComponentId(tn);

  if (this.options.renderComponentWrapper) {
    this.html += 'val = idom.elementOpen("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(grpAttrs.static);
    this.html += ');\n';
  } else {
    this.html += 'val = null;\n';
  }

  this.html += 'hbs.component(val, "' + tn + '", "' + cid + '", context, {\n';
  this._serializeComponentAttributes(attrs);
  this.html += '});\n';

  if (childNodes && childNodes.length > 0) {
    this._addComponentContentTemplate(cid, childNodes);
  }

  if (this.options.renderComponentWrapper) {
    this.html += 'idom.elementClose("' + tn + '");\n';
  }
}

/**
 * Serialize Element
 * @param  object node The AST node to serialize
 */
Serializer.prototype._serializeElement = function (node) {
    var tn = this.treeAdapter.getTagName(node),
        ns = this.treeAdapter.getNamespaceURI(node),
        attrs = this.treeAdapter.getAttrList(node);

  attrs = this._groupAttrsByType(attrs);

  if (tn === 'require') {
    this._serializeRequireElement(node, tn, ns, attrs);
    return;
  }

  if (tn !== $.AREA   && tn !== $.BASE  && tn !== $.BASEFONT && tn !== $.BGSOUND && tn !== $.BR    && tn !== $.BR &&
      tn !== $.COL  && tn !== $.EMBED && tn !== $.FRAME    && tn !== $.HR      && tn !== $.IMG   && tn !== $.INPUT &&
      tn !== $.KEYGEN && tn !== $.LINK  && tn !== $.MENUITEM && tn !== $.META    && tn !== $.PARAM && tn !== $.SOURCE &&
      tn !== $.TRACK  && tn !== $.WBR) {
    this._serializeBlockElement(node, tn, ns, attrs);
  } 
  else {
    this._serializeVoidElement(node, tn, ns, attrs);
  }
};

/**
 * Serialize <require> element
 * 
 * @param  object node  Current node
 * @param  string tn    Tag name
 * @param  string ns    Name space
 * @param  object attrs Dynamic and Static attributes
 * 
 * @return void
 */
Serializer.prototype._serializeRequireElement = function(node, tn, ns, attrs) {
  if (attrs.dynamic.length) {
    throw this._buildParsingError("Require tags cannot contain dynamic attributes");
  }

  var i = 0, l = attrs.static.length, attr, moduleName = false;
  for (; i < l; i++) {
    attr = attrs.static[i];
    if (attr.name === 'from') {
      moduleName = attr.value;
      break;
    }
  }

  if (!moduleName) {
    throw this._buildParsingError("Require tag must have a 'from' attribute");
  }

  this.headers += 'require("' + moduleName + '");\n';
};

Serializer.prototype._serializeVoidElement = function(node, tn, ns, attrs) {
  // VOID Elements Without dynamic attributes
  if (attrs.dynamic.length < 1) {
    this.html += 'idom.elementVoid("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(attrs.static);
    this.html += ');\n';
  }
  // VOID Element with dynamic attributes 
  else {
    this.html += 'idom.elementOpenStart("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(attrs.static);
    this.html += ');\n';
    this._serializeElementDynamicAttrs(attrs.dynamic);
    this.html += 'idom.elementOpenEnd("' + tn + '");\n';
    this.html += 'idom.elementClose("' + tn + '");\n';
  }
};

Serializer.prototype._serializeBlockElement = function(node, tn, ns, attrs) {
  // BLOCK elements without dynamic attributes
  if (attrs.dynamic.length < 1) {
    this.html += 'idom.elementOpen("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(attrs.static);
    this.html += ');\n';
  }
  // BLOCK Element with dynamic attributes
  else {
    this.html += 'idom.elementOpenStart("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(attrs.static);
    this.html += ');\n';
    this._serializeElementDynamicAttrs(attrs.dynamic);
    this.html += 'idom.elementOpenEnd("' + tn + '");\n';
  }

  if (tn === $.PRE || tn === $.TEXTAREA || tn === $.LISTING) {
    var firstChild = this.treeAdapter.getFirstChild(node);

    if (firstChild && this.treeAdapter.isTextNode(firstChild)) {
      var content = this.treeAdapter.getTextNodeContent(firstChild);

      if (content[0] === '\n')
        this.html += '\n';
    }
  }

  var childNodesHolder = tn === $.TEMPLATE && ns === NS.HTML ?
      this.treeAdapter.getTemplateContent(node) :
      node;
  var childNodes = this.treeAdapter.getChildNodes(childNodesHolder);

  this._serializeChildNodes(childNodes);
  this.html += 'idom.elementClose("' + tn + '");\n';  
}

Serializer.prototype._serializeTextNodes = function (nodes) {
  var i, l, text, texts = [], html = this.html;

  // In case there is only one static text
  if (nodes.length === 1 && 
      !this.treeAdapter.isMustacheNode(nodes[0])) {
    text = this._getTextNodeValue(nodes[0]);
    // Do not collapse white spaces
    // if (text.trim().length) {
      this.html += 'idom.text(' + JSON.stringify(text) + ');\n'; 
    // }
    return;
  }

  for (i = 0, l = nodes.length; i < l; ++i) {
    if (this.treeAdapter.isMustacheNode(nodes[i])) {
      this.html = '';
      this._serializeMustacheExpr(nodes[i].mustache.path, nodes[i].mustache.special);
      texts.push(this.html);
    } else {
      texts.push(JSON.stringify(this._getTextNodeValue(nodes[i])));
    }
  }

  this.html = html + 'idom.text(' + texts.join(' + ') + ');\n';  
};

Serializer.prototype._groupAttrsByType = function(attrs) {
  var i, l, vals, staticAttrs  = [], dynamicAttrs = [];
  for (i = 0, l = attrs.length; i < l; ++i) {
    
    // A mustache inside the element
    if (attrs[i].hasOwnProperty("mustache")) {
      dynamicAttrs.push(attrs[i]);
      continue;
    }

    vals = attrs[i].dynamicValues || [];

    if (attrs[i].value !== "" || vals.length === 0) {
      staticAttrs.push(attrs[i]);
    }

    // A mustache inside an element's attribute's value    
    else {
      dynamicAttrs.push(attrs[i]);
    }
  }

  return {
    static:  staticAttrs,
    dynamic: dynamicAttrs
  };
};

Serializer.prototype._getTextNodeValue = function(node) {
  var content = this.treeAdapter.getTextNodeContent(node),
    parent = this.treeAdapter.getParentNode(node),
    parentTn = void 0;

  if (parent && this.treeAdapter.isElementNode(parent)) {
    parentTn = this.treeAdapter.getTagName(parent);
  }

  if (parentTn === $.STYLE || parentTn === $.SCRIPT || parentTn === $.XMP || parentTn === $.IFRAME ||
      parentTn === $.NOEMBED || parentTn === $.NOFRAMES || parentTn === $.PLAINTEXT || parentTn === $.NOSCRIPT) {
    return content; 
  }
  
  return Serializer.escapeString(content, false);
};

Serializer.prototype._groupMustacheAttrsByType = function(attrs, args, hash) {
  var i, l, attr;
  for (i = 0, l = attrs.length; i < l; ++i) {
    attr = attrs[i];
    if (attr.valueType !== null) {
      hash.push(attr);
    }
    else {
      args.push(attr);
    }
  }
}

Serializer.prototype._serializeMustacheAttrs = function(node) {
  var i, l, attr, args = [], hash = [];

  // If no attributes at all
  if (!node.attrs || !node.attrs.length) { 
    this.html += '[],{}';
    return;
  }

  // Separate arguments and hash values  
  this._groupMustacheAttrsByType(node.attrs, args, hash);

  // Serialize Arguments
  this.html += '[';
  for (i = 0, l = args.length; i < l; ++i) {
    attr = args[i];
    if (i > 0) {
      this.html += ', ';
    }

    this._serializeMustacheAttrName(attr);
  }

  this.html += '], {';

  // Serialize Hash
  for (i = 0, l = hash.length; i < l; ++i) {
    attr = hash[i];
    if (i > 0) {
      this.html += ', ';
    }

    this.html += '"' + attr.name + '":';
    this._serializeMustacheAttrValue(attr);
  }
  this.html += '}';
};

Serializer.prototype._serializeMustacheAttrName = function (attr) {
  if (attr.nameType === Object) {
      this._serializeMustacheExpr(attr.namePath);
  }
  else if (attr.nameType === Number || attr.nameType === Boolean) {
    this.html += attr.name;
  }
  else {
    this.html += JSON.stringify(attr.name);
  }  
};

Serializer.prototype._serializeMustacheAttrValue = function (attr) {
  if (attr.valueType === Object) {
    this._serializeMustacheExpr(attr.valuePath);
  }
  else if (attr.valueType === Number || attr.valueType === Boolean) {
    this.html += attr.value;
  }
  else {
    this.html += JSON.stringify(attr.value);
  }
};

Serializer.prototype._serializeMustacheAttrIfHelper = function(node) {
  var i, l, attr, name, args = [], hash = [];
  
  this._groupMustacheAttrsByType(node.attrs, args, hash);

  if (args.length !== 1) {
    throw this._buildParsingError("Mustache inline if helper accepts only 1 value argument and one or more hash values: {{if condition attr=value ...}}");
  }

  if (hash.length === 0) {
    name = JSON.stringify(_.last(args[0].namePath));
    this.html += '(val = ';
    this._serializeMustacheAttrName(args[0]);
    this.html += ') && idom.attr(' + name + ', val);\n';
    return;
  }

  this.html += 'if (';
  this._serializeMustacheAttrName(args[0]);
  this.html += ') {\n';

  // Separate arguments and hash values  
  for (i = 0, l = hash.length; i < l; ++i) {
    attr = hash[i];
    name = JSON.stringify(attr.name);
    this.html += 'idom.attr(' + name + ', ';
    this._serializeMustacheAttrValue(attr);
    this.html += ');\n';
  }

  this.html += '}';
};

Serializer.prototype._serializeMustacheAttrUnlessHelper = function(node) {
  var i, l, attr, args = [], hash = [];
  
  this._groupMustacheAttrsByType(node.attrs, args, hash);

  if (args.length !== 1) {
    throw this._buildParsingError("Mustache inline if helper needs only 1 non-hash argument");
  }

  if (hash.length === 0) {
    name = JSON.stringify(_.last(args[0].namePath));
    this.html += '(val = ';
    this._serializeMustacheAttrName(args[0]);
    this.html += ') && idom.attr(' + name + ', val);\n';
    return;
  }

  this.html += 'if (!';
  this._serializeMustacheAttrName(args[0]);
  this.html += ') {\n';

  // Separate arguments and hash values  
  for (i = 0, l = hash.length; i < l; ++i) {
    attr = hash[i];
    this.html += 'idom.attr(' + JSON.stringify(attr.name) + ', ';
    this._serializeMustacheAttrValue(attr);
    this.html += ');\n';
  }

  this.html += '}';
};


Serializer.prototype._serializeMustacheAttrValIfHelper = function(node, inverse) {
  var i, l, attr, name, args = [], hash = [];
  
  this._groupMustacheAttrsByType(node.attrs, args, hash);

  if (args.length === 0) {
    throw this._buildParsingError("Mustache inline if helper needs at least 1 value argument");
  }

  if (hash.length !== 0) {
    throw this._buildParsingError("Mustache inline if helper can't take hash values if is inside an attribute value");
  }

  inverse = (inverse === true ? '!' : '');

  if (args.length === 1) {
    name = JSON.stringify(_.last(args[0].namePath));
    this.html += '(' + inverse;
    this._serializeMustacheAttrName(args[0]);
    this.html += ' ? ' + name + ' : "")';
    return;
  }

  this.html += '(' + inverse;
  this._serializeMustacheAttrName(args[0]);
  this.html += ' ? (';

  // Separate arguments and hash values  
  for (i = 1, l = args.length; i < l; ++i) {
    this._serializeMustacheAttrName(args[i]);
    if ((i + 1) < l) {
      this.html += ') + (';
    }
  }

  this.html += ') : "")';
};


Serializer.prototype._serializeMustacheBlock = function(tn, node) {
  var namePath, attr;
  this.mustacheStack.push({tn:tn, node:node});
  switch (tn) {
    case "if":
      attr = _.first(node.attrs);
      namePath = attr.namePath;
      if (node.mustache.location === 'body') {
        this.html += 'if (';

        // TODO: Decide if we should throw an exeption if the attr type is not a mustache expression
        if (attr.nameType === Number || attr.nameType === Boolean) {
          this.html += attr.name;
        } 
        else if(attr.nameType === String) {
          this.html += JSON.stringify(attr.name);
        }
        else {
          this._serializeMustacheExpr(namePath);
        }

        this.html += ') {\n';
      } else {
        this.html += '(';
        this._serializeMustacheExpr(namePath);
        this.html += ') ? \n';
      }
      break;

    case "unless":
      attr = _.first(node.attrs);
      namePath = attr.namePath;
      if (node.mustache.location === 'body') {
        this.html += 'if (!';

        // TODO: Decide if we should throw an exeption if the attr type is not a mustache expression
        if (attr.nameType === Number || attr.nameType === Boolean) {
          this.html += attr.name;
        } 
        else if(attr.nameType === String) {
          this.html += JSON.stringify(attr.name);
        }
        else {       
          this._serializeMustacheExpr(namePath);
        }

        this.html += ') {\n';
      } else {
        this.html += '(!';
        this._serializeMustacheExpr(namePath);
        this.html += ') ? \n';
      }
      break;

    case "each":

      attr = _.first(node.attrs);
      namePath = attr.namePath;
      this.html += 'hbs.each(context, ';

      if (attr.nameType !== Object) {
        throw this._buildParsingError("Found non mustache expression '" + namePath.join('.') + "' after #each block");
      }

      this._serializeMustacheExpr(namePath);
      this.html += ', function(context) {\n';
      break;

    default:
      namePath = node.mustache.path;
      if (node.mustache.type == TMUSTACHE.BLOCK_INV_OPEN) {
        this.html += 'if (!';
        this._serializeMustacheExpr(namePath, false);
        this.html += ') {\n';
      }
      else if (!node.attrs || !node.attrs.length) {
        this.html += 'hbs.block(context, '; 
        // Pass helper as function instead of evaluate
        this._serializeMustacheExpr(namePath, null, true);
        this.html += ', ';
        this._serializeMustacheAttrs(node);
        this.html += ', function(context) {\n';
      } else {
        this.html += 'hbs.helper("' + tn + '", context, ';
        this._serializeMustacheAttrs(node);
        this.html += ', function(context) {\n';        
      }
      break;
  }
}

// <input value={{val}} class="one {{disabled}}">
Serializer.prototype._serializeElementDynamicAttrs = function(attrs) {
  var tagName, i = 0, l = attrs.length, attr;
  for (; i < l; ++i) {
    attr = attrs[i];
    if (attr.hasOwnProperty("mustache")) {
      // A helper inside an element <input {{helper ...}}>
      if (attr.mustache.type === TMUSTACHE.HELPER) {
        this._serializeMustacheTag(attr);
        this.html += ';\n';
      }
      else {
        throw this._buildParsingError("The use of mustache tags is not supported inside elements");
      }
    }
    else {
      this.html += 'idom.attr("' + attr.name + '", ';
      this._serializeElementDynamicAttrValue(attr.dynamicValues);
      this.html += ');\n'
    }
  }
};

// <input value="before {{id}} after">
Serializer.prototype._serializeElementDynamicAttrValue = function(values) {
  var i = 0, l = values.length, val;
  for (; i < l; ++i) {
    val = values[i];
    if (i > 0) {
      this.html += ' + ';
    }
    if (_.isString(val)) {
      this.html += '"' + val + '"';
    }
    else {
      this._serializeMustacheTag(val);
    }
  }
};

Serializer.prototype._serializeConstAttributes = function (attrs) {
  var i = 0, l = attrs.length, res = [], attr;

  for (; i < l; i++) {
    attr = attrs[i];
    res.push(attr.name);
    res.push(attr.value);
  }

  if (res.length) {
    i = this.constAttrs.length;
    this.constAttrs.push('["' + res.join('","') + '"]');
    this.html += 'attrs[' + i + ']';
  } else {
    this.html += 'null';
  }
};

Serializer.prototype._normalizeAttrName = function(name) {
  name = name.trim();
  // Replace all 'onclick' type of events for 'onClick' etc;
  if (name.indexOf('on') === 0) {
    name = name.replace(/^on([a-z])/i, function($0, $1) { return 'on' + $1.toUpperCase(); });
  }
  // convert dash-case to camel-case: 'click-once' to 'clickOnce'
  if (name.indexOf('-') !== -1) {
    name  = name.replace(/-([a-z])/gi, function($0, $1) { return $1.toUpperCase(); } );
  }
  return JSON.stringify(name);
};

Serializer.prototype._serializeComponentAttributes = function (attrs) {
  var i, l, attr, name;
  for (i = 0, l = attrs.length; i < l; ++i) {
    attr = attrs[i];
    name = this._normalizeAttrName(attr.name);

    if (i > 0) {
      this.html += ',\n';
    }

    // A mustache inside the element <elem {{tag}} />
    if (attr.hasOwnProperty("mustache")) {
      throw this._buildParsingError("Components can only have mustaches as attribute values");
    }

    else if (attr.value !== "" || attr.dynamicValues.length === 0) {
      // static
      this.html += name + ':' + JSON.stringify(attr.value);
    }

    // A mustache inside an element's attribute's value    
    else {
      // dynamic
      this.html += name + ': (';
      this._serializeElementDynamicAttrValue(attr.dynamicValues);
      this.html += ')';
    }
  }
};
