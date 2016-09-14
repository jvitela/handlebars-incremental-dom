'use strict';

var parse5       = require('parse5'),
    TMUSTACHE    = require('../Util/mustache-types'),
    TreeAdapter  = require('../TreeAdapter'),
    doctype      = require('parse5/lib/common/doctype'),
    mergeOptions = require('parse5/lib/common/merge_options'),
    HTML         = require('parse5/lib/common/html'),
    Lodash       = require('lodash');

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
    treeAdapter: TreeAdapter
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
};

// NOTE: exported as static method for the testing purposes
Serializer.escapeString = function (str, attrMode) {
    str = (str || '')
        .replace(AMP_REGEX, '&amp;')
        .replace(NBSP_REGEX, '&nbsp;');

    if (attrMode)
        str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');

    else {
        str = str
            .replace(LT_REGEX, '&lt;')
            .replace(GT_REGEX, '&gt;');
    }

    return str;
};

//API
Serializer.prototype.serialize = function () {
  var childNodes = this.treeAdapter.getChildNodes(this.startNode);
  if (!childNodes) {
    return '';
  }
  this.id = Date.now();
  this.elemCount = 0;
  this.html = 'var val;\n';
  this.html += "data = (data && data.root) ? data : { 'id': (data && data.id), 'data': data, 'root': data };\n";
  this._serializeChildNodes(childNodes);
  return this.html;
};

//Internals
Serializer.prototype._getId = function(tn) {
  return 'hbs.id(data, "' + this.id + ':' + tn + ':' + (++this.elemCount) + '")';
};

Serializer.prototype._buildParsingError = function(msg, token) {
  var err = new SyntaxError(msg);
  err.lineNumber   = 1; // this.lineNumber;
  err.columnNumber = 1; // this.columnNumber;
  err.lineStr      = "";
  return err;
};


Serializer.prototype._serializeChildNodes = function (childNodes) {
  var i, l, currentNode;

  if (!childNodes) {
    return;
  }

  for (i = 0, l = childNodes.length; i < l; i++) {
    currentNode = childNodes[i];

    if (this.treeAdapter.isMustacheNode(currentNode)) {
      this._serializeMustacheTag(currentNode);
    }

    else if (this.treeAdapter.isWebComponent(currentNode)) {
      this._serializeWebComponent(currentNode);
    }

    else if (this.treeAdapter.isElementNode(currentNode)) {
      this._serializeElement(currentNode);
    }

    else if (this.treeAdapter.isTextNode(currentNode)) {
      this._serializeTextNode(currentNode);
    }

    // else if (this.treeAdapter.isCommentNode(currentNode))
    //   this._serializeCommentNode(currentNode);

    // else if (this.treeAdapter.isDocumentTypeNode(currentNode))
    //   this._serializeDocumentTypeNode(currentNode);
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
    // Block tags are only allowed in the body 
    // if (node.mustache.location === 'body') {
      this.html += '} else {\n';
    // } else {
    //   this.html += ' : ';
    // }
  }

  else if (node.mustache.type === TMUSTACHE.HELPER) {
    if (node.mustache.location === 'body') {
      this.html += 'idom.text(hbs.helper(' + name + ', data, ';
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
          // this.html += 'hbs.helper(' + name + ', data, ';
          // this._serializeMustacheAttrs(node);
          // this.html += ')';        
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
          this.html += 'hbs.helper(' + name + ', data, ';
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
      // Block tags are allowed only in the body
      // if (node.mustache.location === 'body') {
        this.html += '}\n';  
      // } else {
      //   this.html += ') : "")';
      // }
    }
    else if (node.mustache.location === 'body') {
      this.html += inlineHelpers.indexOf(tn) === -1 ? '});\n' : '}\n';
    } 
    else {
      this.html += inlineHelpers.indexOf(tn) === -1 ? '})' : '';
    }
  }

  else if (node.mustache.type == TMUSTACHE.PARTIAL) {
    this.html += 'hbs.partial("' + tn + '", data);\n';
  }

  else {
    if (node.mustache.location === 'body') {
      this.html += 'idom.text(';
      this._serializeMustacheExpr(node.mustache.path, node.mustache.special);
      this.html += ');\n';
    } else {
      this._serializeMustacheExpr(node.mustache.path, node.mustache.special);
    }
  }

  childNodesHolder = (tn === $.TEMPLATE && ns === NS.HTML) ? this.treeAdapter.getTemplateContent(node) : node;
  childNodes = this.treeAdapter.getChildNodes(childNodesHolder);
  this._serializeChildNodes(childNodes);
}

Serializer.prototype._serializeMustacheExpr = function(path, def) {
  //var path = this.treeAdapter.getMustachePath(node);
  path = JSON.stringify(path);
  def  = def !== undefined ? (', ' + JSON.stringify(def)) : '';
  this.html += 'hbs.get(' + path + ', data' + def + ')';
}

Serializer.prototype._serializeWebComponent = function (node) {
  var tn         = this.treeAdapter.getTagName(node),
      attrs      = this.treeAdapter.getAttrList(node),
      childNodes = this.treeAdapter.getChildNodes(node);

  var grpAttrs = this._groupAttrsByType(attrs);
  this.html += 'idom.elementOpen("' + tn + '", ' + this._getId(tn) + ', []);';
  // BLOCK elements without dynamic attributes
  if (grpAttrs.dynamic.length < 1) {
    this.html += 'idom.elementOpen("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(grpAttrs.static);
    this.html += ');\n';
  }
  // BLOCK Element with dynamic attributes
  else {
    this.html += 'idom.elementOpenStart("' + tn + '", ' + this._getId(tn) + ', ';
    this._serializeConstAttributes(grpAttrs.static);
    this.html += ');\n';
    this._serializeElementDynamicAttrs(grpAttrs.dynamic);
    this.html += 'idom.elementOpenEnd("' + tn + '");\n';
  }

  this.html += 'hbs.component("' + tn + '", data, {\n';
  this.html += '"id": data.id,\n';
  this._serializeComponentAttributes(attrs);
  if (childNodes && childNodes.length > 0) {
    this.html += '}, function(data) {\n';
    this._serializeChildNodes(childNodes);
  }
  this.html += '});\n';

  this.html += 'idom.elementClose("' + tn + '");';
}

Serializer.prototype._serializeElement = function (node) {
    var tn = this.treeAdapter.getTagName(node),
        ns = this.treeAdapter.getNamespaceURI(node),
        attrs = this.treeAdapter.getAttrList(node);

  attrs = this._groupAttrsByType(attrs);

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

  // var childNodesHolder = tn === $.TEMPLATE && ns === NS.HTML ?
  //     this.treeAdapter.getTemplateContent(node) :
  //     node;
  // var childNodes = this.treeAdapter.getChildNodes(childNodesHolder);    
  // this._serializeChildNodes(childNodes);
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

Serializer.prototype._serializeTextNode = function (node) {
  var text = this._getTextNodeValue(node);
  // Ignore single line jumps
  if (text == "\n") {
    return;
  }
  this.html += 'idom.text(' + JSON.stringify(text) + ');\n';
};

Serializer.prototype._groupAttrsByType = function(attrs) {
  var i, l, vals, staticAttrs  = [], dynamicAttrs = [];
  for (i = 0, l = attrs.length; i < l; ++i) {
    
    // A mustache inside the element
    if (attrs[i].hasOwnProperty("mustache")) {
      dynamicAttrs.push(attrs[i]);
      continue;
    }

    vals = attrs[i].dynamicValues;

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
  else if (attr.nameType === Number) {
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

// Serializer.prototype._serializeMustacheHelperAttr = function(node) {
//   var i, l, attr, args = [], hash = [];
  
//   this._groupMustacheAttrsByType(node.attrs, args, hash);

//   if (args.length > 0) {
//     throw this._buildParsingError("Mustache helper attr can receive only hash values");
//   }

//   // Separate arguments and hash values  
//   for (i = 0, l = hash.length; i < l; ++i) {
//     attr = hash[i];
//     this.html += 'idom.attr(' + JSON.stringify(attr.name) + ', ';
//     this._serializeMustacheAttrValue(attr);
//     this.html += ')';
//   }
// };

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
      this.html += 'hbs.each(data, ';

      if (attr.nameType !== Object) {
        throw this._buildParsingError("Found non mustache expression '" + namePath.join('.') + "' after #each block");
      }

      this._serializeMustacheExpr(namePath);
      this.html += ', function(data) {\n';
      break;

    default:
      namePath = node.mustache.path;
      if (node.mustache.type == TMUSTACHE.BLOCK_INV_OPEN) {
        // Block tags are allowed only in the body
        // if (node.mustache.location === 'body') {
          this.html += 'if (!';
          this._serializeMustacheExpr(namePath, false);
          this.html += ') {\n';
        // }
        // else {
        //   this.html += '(!';
        //   this._serializeMustacheExpr(namePath, false);
        //   this.html += ' ? (\n';          
        // }
      }
      else if (!node.attrs || !node.attrs.length/*node.mustache.type == TMUSTACHE.BLOCK_OPEN*/) {
        this.html += 'hbs.block(data, ' + JSON.stringify(namePath);
        //this._serializeMustacheExpr(namePath, null);
        this.html += ', ';
        this._serializeMustacheAttrs(node);
        this.html += ', function(data) {\n';
      } else {
        this.html += 'hbs.helper("' + tn + '", data, ';
        this._serializeMustacheAttrs(node);
        this.html += ', function(data) {\n';        
      }
      break;
  }
}

// <input value={{val}} {{disabled}}>
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
      // TODO: Decide if this will be supported at all
      else {
        throw this._buildParsingError("The use of mustache tags is not supported inside elements");
        // tagName = _.last(attr.mustache.path);
        // if (tagName[0] === "~" || tagName[0] === "@") {
        //   throw this._buildParsingError("The use of literal or special identifiers is not supported inside elements");
        // }
        // tagName = JSON.stringify(tagName);
        // this.html += 'idom.attr(' + tagName + ', ';
        // this._serializeMustacheTag(attr);
        // this.html += ');\n';
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
    this.html += '["' + res.join('","') + '"]';
  } else {
    this.html += 'null';
  }
};

Serializer.prototype._serializeComponentAttributes = function (attrs) {
  var i, l, attr, name;
  for (i = 0, l = attrs.length; i < l; ++i) {
    attr = attrs[i];
    name = JSON.stringify(attr.name);

    if (i > 0) {
      this.html += ',\n';
    }

    // A mustache inside the element <elem {{tag}} />
    if (attr.hasOwnProperty("mustache")) {
      // dynamic
      // this.html += name + ':';
      // this._serializeMustacheTag(attr);
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
