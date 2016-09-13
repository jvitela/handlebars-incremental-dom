'use strict';

var _ = require('lodash'),
    extend        = require('../Util/extend'),
    TMUSTACHE     = require('../Util/mustache-types'),
    UNICODE       = require('parse5/lib/common/unicode'),
    BaseTokenizer = require('parse5/lib/tokenizer');

//Aliases
var $  = UNICODE.CODE_POINTS,
    $$ = UNICODE.CODE_POINT_SEQUENCES;

$.MUSTACHE_OPEN  = 0x7B;       // {
$.MUSTACHE_CLOSE = 0x7D;       // }
$.SQUARE_BRACKET_OPEN  = 0x5B; // [
$.SQUARE_BRACKET_CLOSE = 0x5D; // ]
$.DOT = 0x2E;                  // .
$.CARET = 0x5E;           // ^
$.AT = 0x40;
// $.NUMBER_SIGN = 0x23,       // #
// $.AMPERSAND = 0x26,         // &
// $.GREATER_THAN_SIGN = 0x3E, // >
// $.SOLIDUS = 0x2F,           // /
$.PERCENT_SIGN     = 0x25;
$.PARENTESIS_OPEN  = 0x28;
$.PARENTESIS_CLOSE = 0x29;
$.ASTERISK = 0x2A;
$.PLUS_SIGN = 0x2B;
$.COMMA = 0x2C;
$.BACKSLASH = 0x5C;
$.PIPE = 0x7C;
$.TILDE = 0x7E;

$$.MUSTACHE_PARENTREF_STRING   = [$.DOT, $.DOT, $.SOLIDUS];
$$.MUSTACHE_SELFREF_STRING     = [$.DOT, $.SOLIDUS];
$$.DOUBLE_MUSTACHE_OPEN_STRING = [$.MUSTACHE_OPEN, $.MUSTACHE_OPEN];
// $$.TRIPLE_MUSTACHE_OPEN_STRING  = [0x7B, 0x7B, 0x7B];
// $$.DOUBLE_MUSTACHE_CLOSE_STRING = [0x7D, 0x7D];
// $$.TRIPLE_MUSTACHE_CLOSE_STRING = [0x7D, 0x7D, 0x7D];

//Utils

//OPTIMIZATION: these utility functions should not be moved out of this module. V8 Crankshaft will not inline
//this functions if they will be situated in another module due to context switch.
//Always perform inlining check before modifying this functions ('node --trace-inlining').
function isWhitespace(cp) {
  return cp === $.SPACE || cp === $.LINE_FEED || cp === $.TABULATION || cp === $.FORM_FEED;
}

function isAsciiDigit(cp) {
  return cp >= $.DIGIT_0 && cp <= $.DIGIT_9;
}

function isAsciiUpper(cp) {
  return cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_Z;
}

function isAsciiLower(cp) {
  return cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_Z;
}

function isAsciiAlphaNumeric(cp) {
  return isAsciiDigit(cp) || isAsciiUpper(cp) || isAsciiLower(cp);
}

function isDigit(cp, isHex) {
  return isAsciiDigit(cp) || isHex && (cp >= $.LATIN_CAPITAL_A && cp <= $.LATIN_CAPITAL_F ||
                                       cp >= $.LATIN_SMALL_A && cp <= $.LATIN_SMALL_F);
}

/**
 * Taken from Handlebars website:
 * Identifiers may be any unicode character except for the following
 *  ! " # % & ' ( ) * + , ; < = > @ [ \ ] ^ ` { | } ~
 *
 * See: http://handlebarsjs.com/expressions.html
 */
function isHbsIndentifier(cp) {
  return !(cp == $.EXCLAMATION_MARK ||
           cp == $.QUOTATION_MARK   ||
           cp == $.NUMBER_SIGN ||
           cp == $.PERCENT_SIGN ||
           cp == $.AMPERSAND || 
           cp == $.APOSTROPHE || 
           cp == $.PARENTESIS_OPEN || 
           cp == $.PARENTESIS_CLOSE || 
           cp == $.ASTERISK || 
           cp == $.PLUS_SIGN || 
           cp == $.COMMA || 
           cp == $.SEMICOLON || 
           cp == $.LESS_THAN_SIGN || 
           cp == $.EQUALS_SIGN || 
           cp == $.GREATER_THAN_SIGN || 
           cp == $.AT || 
           cp == $.SQUARE_BRACKET_OPEN || 
           cp == $.BACKSLASH || 
           cp == $.SQUARE_BRACKET_CLOSE || 
           cp == $.CARET || 
           cp == $.GRAVE_ACCENT || 
           cp == $.MUSTACHE_OPEN || 
           cp == $.PIPE || 
           cp == $.MUSTACHE_CLOSE || 
           cp == $.TILDE);
}

//NOTE: String.fromCharCode() function can handle only characters from BMP subset.
//So, we need to workaround this manually.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
function toChar(cp) {
  if (cp <= 0xFFFF)
    return String.fromCharCode(cp);

  cp -= 0x10000;
  return String.fromCharCode(cp >>> 10 & 0x3FF | 0xD800) + String.fromCharCode(0xDC00 | cp & 0x3FF);
}

/**
 * Custom tokenizer.
 * Extends Parse5 Tokenizer
 */
var Tokenizer = extend(BaseTokenizer, {

  constructor: function() {
    this.lineNumber   = 1; 
    this.columnNumber = 1;

    this.mustacheLocation     = 'body';
    this.prevState            = [];
    this.currentMustacheToken = null;
    this.currentMustacheAttr  = null;
    this.currentMustacheId    = null;
    BaseTokenizer.apply(this, arguments);
  },

  _buildSyntaxError: function(msg, token) {
    var err = new SyntaxError(msg);
    err.lineNumber   = this.lineNumber;
    err.columnNumber = this.columnNumber;
    err.lineStr      = "";
    return err;
  },

  _createStartMustacheTagToken: function() {
    this.currentMustacheToken = {
      type:        'START_TAG_TOKEN',
      tagName:     "",
      selfClosing: true,
      attrs:       [],
      mustache:    {
        path:     [],
        type:     TMUSTACHE.TAG,
        location: this.mustacheLocation
      }
    };
  },

  _createMustachePartialToken: function() {
    this.currentMustacheToken = {
      type:        'START_TAG_TOKEN',
      tagName:     "",
      selfClosing: true,
      attrs:       [],
      mustache:    {
        path:     [],
        type:     TMUSTACHE.PARTIAL,
        location: this.mustacheLocation
      }
    };    
  },

  _createStartMustacheBlockToken: function() {
    this.currentMustacheToken = {
      type:        'START_TAG_TOKEN',
      tagName:     "",
      selfClosing: false,
      attrs:       [],
      mustache:    {
        path:     [],
        type:     TMUSTACHE.BLOCK_OPEN,
        location: this.mustacheLocation,
      }
    };
  },

  _createStartMustacheInvBlockToken: function() {
    this.currentMustacheToken = {
      type:        'START_TAG_TOKEN',
      tagName:     "",
      selfClosing: false,
      attrs:       [],
      mustache:    {
        path:     [],
        type: TMUSTACHE.BLOCK_INV_OPEN,
        location: this.mustacheLocation,
      }
    };
  },

  _createEndMustacheBlockToken: function() {
    this.currentMustacheToken = {
      type:        'END_TAG_TOKEN', // START_TAG_TOKEN
      tagName:     "",
      selfClosing: true,
      ignored:     false,
      mustache:    {
        path:     [],
        type:     TMUSTACHE.BLOCK_CLOSE,
        location: this.mustacheLocation
      }
    };
  },

  _createMustacheIdentifier: function() {
    this.currentMustacheId = {
      str:  "",
      path: [],
      type: Object,
    };
  },

  _emitCurrentMustacheToken: function () {
    var token    = this.currentMustacheToken,
        mustache = token.mustache,
        attrs    = token.attrs;

    this._emitCurrentCharacterToken();

    // Check
    if (this.mustacheLocation !== 'body' &&
        mustache.type !== TMUSTACHE.TAG) {
      throw this._buildSyntaxError("Mustache block tags are only allowed outside Html Tags");
    }

    if (mustache.type === TMUSTACHE.TAG &&
        attrs.length) {
      mustache.type = TMUSTACHE.HELPER;
    }

    if (mustache.type === TMUSTACHE.TAG &&
        attrs.length  === 0 &&
        token.tagName === 'else') {
      mustache.type = TMUSTACHE.BLOCK_ELSE;
      // this.currentMustacheToken.mustache.varAttrs = [];
    }

    if (this.mustacheLocation == 'body') {
      this.tokenQueue.push(token);
    } else if (this.mustacheLocation == 'element') {
      // this.currentMustacheToken.mustache.varAttrs = [];
      this.currentToken.attrs.push(token);
    } else if (this.mustacheLocation == 'attribute-value') {
      this._addAttrValue(token);
    }

    // NOTE: store emited start tag's tagName to determine if the following end tag token is appropriate.
    // if (this.currentMustacheToken.type === BaseTokenizer.START_TAG_TOKEN &&
    //     this.currentMustacheToken.selfClosing === false) {
    //   this.lastMustacheStartTag = this.currentToken;
    // } 
    // else if(this.currentMustacheToken.type === BaseTokenizer.END_TAG_TOKEN) {
    //   this.lastMustacheStartTag = null;
    // }

    this.currentMustacheAttr  = null;
    this.currentMustacheToken = null;
  },

  _addAttrValue: function (chr) {
    var lastIdx;

    if (this.currentAttr.value !== "") {
      this.currentAttr.dynamicValues.push(this.currentAttr.value);
      this.currentAttr.value = "";
    }

    lastIdx = _.max([0, this.currentAttr.dynamicValues.length - 1]);

    if (_.isString(chr) && 
        _.isString(this.currentAttr.dynamicValues[lastIdx])) {
      this.currentAttr.dynamicValues[lastIdx] += chr;
    }
    else {
      this.currentAttr.dynamicValues.push(chr);
    }
  },


  //Tag attributes
  _createAttr: function(attrNameFirstCh) {
    this.currentAttr = {
      name:  attrNameFirstCh,
      value: "",
      dynamicValues: [] // TODO: Leave value as string
    };
  },

  _createMustacheAttr: function() {
    this.currentMustacheAttr = {
      nameType:   null,
      valueType:  null,
      name:       "",
      value:      "",
      namePath:   [],
      valuePath:  []
    };
  },

  _leaveMustacheTagName: function(path) {
    var tagName;
    this.currentMustacheToken.mustache.path = path;
    
    if (path.length === 1) {
      tagName = path[0];
      this.currentMustacheToken.tagName = tagName;
    }

  },

  _leaveMustacheAttrName: function (toState) {
    this.currentMustacheAttr.nameType = String;

    if (this.currentMustacheId) {
      this.currentMustacheAttr.nameType = this.currentMustacheId.type; // Object or Number
      this.currentMustacheAttr.namePath = this._leaveMustacheId();
    }

    if (this.currentMustacheAttr.namePath.length === 1 &&
        (this.currentMustacheAttr.namePath[0] === "true"  || 
         this.currentMustacheAttr.namePath[0] === "false" ||
         this.currentMustacheAttr.namePath[0] === "null")) {
      this.currentMustacheAttr.nameType = Boolean;
      this.currentMustacheAttr.name     = this.currentMustacheAttr.namePath[0];
      this.currentMustacheAttr.namePath = [];
    }

    // Check for numeric identifiers
    if (this.currentMustacheAttr.namePath.length === 1 &&
        this.currentMustacheAttr.nameType === Number) { // !isNaN(this.currentMustacheAttr.namePath[0])
      this.currentMustacheAttr.name     = this.currentMustacheAttr.namePath[0];
      this.currentMustacheAttr.namePath = [];
    }

    if (toState) {
      this.state = toState;
    }

    this.currentMustacheToken.attrs.push(this.currentMustacheAttr);
  },

  _leaveMustacheAttrValue: function (toState) {
    this.currentMustacheAttr.valueType = String;

    if (this.currentMustacheId) {
      this.currentMustacheAttr.valueType = this.currentMustacheId.type; // Object or Number
      this.currentMustacheAttr.valuePath = this._leaveMustacheId();
    }

    // Check for booleans
    if (this.currentMustacheAttr.valuePath.length === 1 &&
        (this.currentMustacheAttr.valuePath[0] === "true"  || 
         this.currentMustacheAttr.valuePath[0] === "false" ||
         this.currentMustacheAttr.valuePath[0] === "null")) {
      this.currentMustacheAttr.valueType = Boolean;
      this.currentMustacheAttr.value     = this.currentMustacheAttr.valuePath[0];
      this.currentMustacheAttr.valuePath = [];
    }

    // Check for numeric identifiers
    if (this.currentMustacheAttr.valuePath.length === 1 &&
        this.currentMustacheAttr.valueType === Number) { // !isNaN(this.currentMustacheAttr.valuePath[0])
      this.currentMustacheAttr.value     = this.currentMustacheAttr.valuePath[0];
      this.currentMustacheAttr.valuePath = [];
    }

    // Make sure values are assigned to String keys
    // {{helper foo_bar=lorem.ipsum}}
    // if (this.currentMustacheAttr.namePath.length) {
    //   this.currentMustacheAttr.name     = this.currentMustacheAttr.namePath.join(".");
    //   this.currentMustacheAttr.nameType = String;
    //   this.currentMustacheAttr.namePath = [];
    // }

    this.currentMustacheAttr = null;
    if (toState) {
      this.state = toState;
    }
  },

  _leaveAttrValue: function (toState) {
    this.state = toState;

    if (this.currentAttr.value !== "" && 
        this.currentAttr.dynamicValues.length > 0) {
      this.currentAttr.dynamicValues.push(this.currentAttr.value);
      this.currentAttr.value = "";
    }
  },

  _leaveAttrName: function (toState) {
    this.state = toState;

    // this.mustacheLocation == 'element'
    if (this.currentMustacheToken) {
      //this.currentMustacheToken.mustache.varAttrs.push(this.currentAttr);
      this.currentMustacheToken.attrs.push(this.currentAttr);

    } else if (!this._isDuplicateAttr()) {
      this.currentToken.attrs.push(this.currentAttr);
    }
  },

  _leaveMustacheIdFragment: function() {
    var currId = this.currentMustacheId;
    if (currId.str.length) {
      if (currId.str === "this") {
        currId.str = "@this";
      }
      currId.path.push(currId.str);
      currId.str = "";
    }
  },

  _leaveMustacheId: function() {
    var last, path = this.currentMustacheId.path;
    this.currentMustacheId = null;
    // Handle special case of @../../index
    if (path[0] == "@") {
      path.shift();
      last = path.pop();
      path.push("@" + last);
    }

    return path;
  },

  // _addMustacheAttrValue: function (chr) {
  //   if (this.currentMustacheAttr.value === null) {
  //     this.currentMustacheAttr.value = chr;
  //   } else {
  //     this.currentMustacheAttr.value += chr;
  //   }
  // },

  _reconsumeInPrevState: function() {
    this.state = this.prevState.pop() || 'DATA_STATE';
    this._unconsume();
  },

  DATA_STATE: function(cp) {
    this.mustacheLocation = 'body';

    if (cp === $.AMPERSAND) {
      this.state = 'CHARACTER_REFERENCE_IN_DATA_STATE';
    }
    else if (cp === $.LESS_THAN_SIGN) {
      this.state = 'TAG_OPEN_STATE';
    }
    else if (cp === $.MUSTACHE_OPEN) {
      this.state = 'BEFORE_MUSTACHE_OPEN_STATE';
    }
    else if (cp === $.NULL) {
      this._emitCodePoint(cp);
    }
    else if (cp === $.EOF) {
      this._emitEOFToken();
    }
    else {
      this._emitCodePoint(cp);
    }
  },

  BEFORE_ATTRIBUTE_NAME_STATE: function(cp) {
    //var dblMustacheMatch = this._consumeSubsequentIfMatch($$.DOUBLE_MUSTACHE_OPEN_STRING, cp, false);
    if (cp === $.MUSTACHE_OPEN) {
      this.mustacheLocation = 'element';
      this.prevState.push('BEFORE_ATTRIBUTE_NAME_STATE');
      this.state = 'BEFORE_MUSTACHE_OPEN_STATE';
    } else {
      BaseTokenizer.prototype.BEFORE_ATTRIBUTE_NAME_STATE.apply(this, arguments);
    }
  },

  BEFORE_ATTRIBUTE_VALUE_STATE: function(cp) {
    // Mustache as unquoted value
    if (cp === $.MUSTACHE_OPEN) {
      this.mustacheLocation = 'attribute-value';
      this.prevState.push('AFTER_ATTRIBUTE_VALUE_STATE');
      this.state = 'BEFORE_MUSTACHE_OPEN_STATE';
    }

    else {
      BaseTokenizer.prototype.BEFORE_ATTRIBUTE_VALUE_STATE.apply(this, arguments); 
    }
  },

  AFTER_ATTRIBUTE_VALUE_STATE: function(cp) {
    if (isWhitespace(cp)) {
      this._leaveAttrValue('BEFORE_ATTRIBUTE_NAME_STATE');
    }

    else if (cp === $.SOLIDUS) {
      this._leaveAttrValue('SELF_CLOSING_START_TAG_STATE');
    }  

    else if (cp === $.GREATER_THAN_SIGN) {
      this._leaveAttrValue(this.prevState.pop() || 'DATA_STATE');
      this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
      this._reconsumeInState(this.prevState.pop() || 'DATA_STATE');
    }
    
    else {
      this._reconsumeInState('BEFORE_ATTRIBUTE_NAME_STATE');
    }    
  },

  SELF_CLOSING_START_TAG_STATE: function (cp) {
    if (cp === $.GREATER_THAN_SIGN) {
      this.currentToken.selfClosing = true;
      this.state = this.prevState.pop() || 'DATA_STATE';
      this._emitCurrentToken();
    }

    else if (cp === $.EOF) {
      this._reconsumeInState(this.prevState.pop() || 'DATA_STATE');
    }

    else {
      this._reconsumeInState('BEFORE_ATTRIBUTE_NAME_STATE');
    }
  },

  ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE: function(cp) {
    // Mustache as unquoted value
    if (cp === $.MUSTACHE_OPEN) {
      this.mustacheLocation = 'attribute-value';
      this.prevState.push('ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE');
      this.state = 'BEFORE_MUSTACHE_OPEN_STATE';
    }

    else {
      BaseTokenizer.prototype.ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE.apply(this, arguments);
    }

  },
  ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE: function(cp) {
    // Mustache as unquoted value
    if (cp === $.MUSTACHE_OPEN) {
      this.mustacheLocation = 'attribute-value';
      this.prevState.push('ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE');
      this.state = 'BEFORE_MUSTACHE_OPEN_STATE';
    }

    else {
      BaseTokenizer.prototype.ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE.apply(this, arguments); 
    }
  },

  ATTRIBUTE_VALUE_UNQUOTED_STATE: function(cp) {
    // Do not allow mustaches after the value start, for example:
    // <input value=123{{val}}456>
    var dblMustacheMatch = this._consumeSubsequentIfMatch($$.DOUBLE_MUSTACHE_OPEN_STRING, cp, false);
    if (dblMustacheMatch) {
      throw this._buildSyntaxError("Found invalid Mustache in the middle of an element's attribute unquoted value");
    }
    else {
      BaseTokenizer.prototype.ATTRIBUTE_VALUE_UNQUOTED_STATE.apply(this, arguments); 
    }
  },

  // Found first '{'
  BEFORE_MUSTACHE_OPEN_STATE: function(cp) {
    if (cp === $.MUSTACHE_OPEN) {
      this.state = 'MUSTACHE_OPEN_STATE';
    }
    else {
      this._emitChar('{');
      this._reconsumeInPrevState();
    }
  },

  // Found second '{'
  MUSTACHE_OPEN_STATE: function(cp) {
    if (cp == $.MUSTACHE_CLOSE) {
      throw this._buildSyntaxError("Found mustache with null value");
    } 

    if (cp === $.MUSTACHE_OPEN || cp === $.AMPERSAND) {
      throw this._buildSyntaxError("Escaped Mustache tags are Not allowed");
    }

    if (cp == $.NUMBER_SIGN) {
      this._createStartMustacheBlockToken();
      this._createMustacheIdentifier();
      this.prevState.push('BEFORE_MUSTACHE_ATTRIBUTE_NAME_STATE');
      this.state = 'MUSTACHE_IDENTIFIER_STATE';
    }

    else if (cp == $.CARET) {
      this._createStartMustacheInvBlockToken();
      this._createMustacheIdentifier();
      this.prevState.push('BEFORE_MUSTACHE_ATTRIBUTE_NAME_STATE');
      this.state = 'MUSTACHE_IDENTIFIER_STATE';
    }

    else if (cp == $.SOLIDUS) {
      // TODO: Check for opened blocks
      this._createEndMustacheBlockToken();
      this._createMustacheIdentifier();
      this.prevState.push('BEFORE_MUSTACHE_ATTRIBUTE_NAME_STATE');
      this.state = 'MUSTACHE_IDENTIFIER_STATE';
    }

    else if (cp == $.GREATER_THAN_SIGN) {
      if (this.mustacheLocation !== 'body') {
        throw this._buildSyntaxError("Mustache partials are only allowed in the body");
      }
      this._createMustachePartialToken();
      this._createMustacheIdentifier();
      this.prevState.push('AFTER_MUSTACHE_PARTIAL_NAME_STATE');
      this.state = 'MUSTACHE_IDENTIFIER_STATE';      
    }

    else {
      this._createStartMustacheTagToken();
      this._createMustacheIdentifier();
      this.prevState.push('BEFORE_MUSTACHE_ATTRIBUTE_NAME_STATE');
      this._reconsumeInState('MUSTACHE_IDENTIFIER_STATE');
    }
  },

  MUSTACHE_CLOSE_STATE: function(cp) {
    // End of tag
    if (cp == $.MUSTACHE_CLOSE) {
      this.state = this.prevState.pop() || 'DATA_STATE';
      this._emitCurrentMustacheToken();
    } 
    else {
      throw this._buildSyntaxError("Invalid character after first closing mustache");
    }
  },

  /**
   * Case of data between []
   * We accept every character until ]
   */
  MUSTACHE_IDENTIFIER_LITERAL_STATE: function(cp) {
    var currId = this.currentMustacheId;

    if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file inside Mustache tag literal");
    }

    else if (cp === $.SQUARE_BRACKET_CLOSE) {
      //currId.str += "]";
      this._leaveMustacheIdFragment();
      this.state = 'MUSTACHE_IDENTIFIER_STATE';
    }

    else {
      currId.str += toChar(cp);
    }
  },

  /**
   * 
   * SELF:         /^(\.|this)$/
   * SPECIAL:      /^@([\.]{1,2}\/)*(index|key|first|last|root)$/
   * INDENTIFIER:  /^((@root[\/\.])|(\.\/)|(\.\.\/)+)?(\w+|\[[^\[\]]+\])([\.\/](\w+|\[[^\[\]]+\])+)*$/
   * 
   */
  MUSTACHE_IDENTIFIER_STATE: function(cp) {
    var currId = this.currentMustacheId,
        isFirstChar = (currId.str.length == 0 && currId.path.length == 0);

    if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file inside mustache identifier.");
    }

    else if (isWhitespace(cp)) {
      // Ignore initial withespaces
      if (isFirstChar) {
        return;
      }
      this._leaveMustacheIdFragment();
      this._reconsumeInPrevState();
    }

    else if (isFirstChar && (cp==$.HYPHEN_MINUS || isAsciiDigit(cp))) {
      currId.str  = toChar(cp);
      this.state  = 'MUSTACHE_IDENTIFIER_NUMERIC_STATE';
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      if (isFirstChar) {
        throw this._buildSyntaxError("Found empty identifier.");
      }
      this._leaveMustacheIdFragment();
      this._reconsumeInPrevState();
    }

    else if (cp == $.SQUARE_BRACKET_OPEN) {
      this._leaveMustacheIdFragment();
      // currId.str = "~";
      this.state = 'MUSTACHE_IDENTIFIER_LITERAL_STATE';
    }

    else if (cp == $.AT) {
      // '@' Can only be at identifier start
      if (!isFirstChar) {
        throw this._buildSyntaxError("Found illegal '@' inside a mustache identifier.");
      }
      currId.str += '@';
    }

    else if (cp == $.SOLIDUS) {
      if (isFirstChar) {
        throw this._buildSyntaxError("Found illegal '/' at start of a mustache identifier.");
      }
      // else if (currId.str[0] === "@" && currId.str !== "@root" && prevChar !== $.DOT) {
      //   throw this._buildSyntaxError("Found illegal '/' after special mustache identifier."); 
      // }
      this._leaveMustacheIdFragment();
    }

    // Find first dot
    else if (cp == $.DOT) {
      this._leaveMustacheIdFragment();
      currId.str = ".";
      this.state = 'MUSTACHE_IDENTIFIER_PATH_STATE';
    }

    else if (cp == $.EQUALS_SIGN) {
      this._leaveMustacheIdFragment();
      this._reconsumeInPrevState();
    }

    else if (isHbsIndentifier(cp)) {
      currId.str += toChar(cp);
    }    

    else {
      throw this._buildSyntaxError("Found illegal character '" + toChar(cp) + "' in mustache tag name.");
    }
  },

  MUSTACHE_IDENTIFIER_NUMERIC_STATE: function(cp) {
    var currId = this.currentMustacheId;

    if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file inside mustache numeric identifier.");
    }

    else if (isAsciiDigit(cp)) {
      currId.str += toChar(cp);
    }

    else if (cp === $.DOT) {
      // Numeric expressions can have only one dot
      if (currId.path.length > 1) {
        this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
      } else {
        this._leaveMustacheIdFragment();
      }
    }

    else if (cp === $.MUSTACHE_CLOSE || isWhitespace(cp)) {
      this._leaveMustacheIdFragment();
      currId.path = [currId.path.join(".")];
      currId.type = Number;
      this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
    }

    else {
      this._leaveMustacheIdFragment();
      this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
    }
  },

  /**
   * Handles the following cases:
   *   {.}
   *   ./
   *   ../
   * @param {[type]} cp [description]
   */
  MUSTACHE_IDENTIFIER_PATH_STATE: function(cp) {
    var currId = this.currentMustacheId;

    if (cp == $.DOT) {
      currId.str += ".";
    }

    else if (cp === $.MUSTACHE_CLOSE) {

      if (currId.str.length > 2 || currId.path.length > 0) {
        throw this._buildSyntaxError("Found illegal '" + currId.str + "}' in mustache identifier path.");
      }

      switch (currId.str.length) {
        case 1:
          currId.path.push("@this");
          break;
        case 2:
          currId.path.push("@parent");
          break;
      }
      currId.str = "";
      this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
    }

    else if (cp == $.SOLIDUS) {
      switch (currId.str.length) {
        case 1:
          // a "./" Can only be at the beggining or after an initial "@"
          if (currId.path.length == 0   ||
              (currId.path.length == 1 && currId.path[0] == "@")) {
            currId.path.push("@this");
          } else {
            throw this._buildSyntaxError("Found illegal './' after mustache identifier fragment.");
          }
          break;
        case 2:
          currId.path.push("@parent");
          break;
        default:
          throw this._buildSyntaxError("Found illegal '" + currId.str + "/' in mustache identifier path.");
      }
      currId.str = "";
      this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
    }

    else {
      // If we have more than one dot following any other char: "..a", "..["
      // Or if we have one dot starting an identifier: ".a", ".["
      if (currId.str.length > 1 || 
          currId.path.length === 0) {
        throw this._buildSyntaxError("Found illegal '" + currId.str + "' starting a mustache identifier.");
      }
      currId.str = "";
      this._reconsumeInState("MUSTACHE_IDENTIFIER_STATE");
    }
  },

  /**
   * We control the result of the Tagname identifier state
   */
  BEFORE_MUSTACHE_ATTRIBUTE_NAME_STATE: function(cp) {
    // Store the Tagname identifier
    var path;
    if (this.currentMustacheId) {
      path = this._leaveMustacheId();
      this._leaveMustacheTagName(path);
    }

    if (cp === $.EOF) {
      throw this._buildSyntaxError("Found unexpected end of file after mustache tag name");
    }

    else if (isWhitespace(cp)) {
      this.state = 'MUSTACHE_ATTRIBUTE_NAME_STATE';
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      this.state = 'MUSTACHE_CLOSE_STATE';
    }

    else {
      throw this._buildSyntaxError("Found unexpected characted after mustache tag name: " + toChar(cp));
    }
  },

  MUSTACHE_ATTRIBUTE_NAME_STATE: function(cp) {
    
    // Ignore whitespaces
    if (isWhitespace(cp)) {
      return;
    }

    if (cp === $.MUSTACHE_CLOSE) {
      this.state = 'MUSTACHE_CLOSE_STATE';
    }

    else if (cp === $.QUOTATION_MARK) {
      this._createMustacheAttr();
      // this.currentMustacheAttr.quotedName = true;
      this.state = 'MUSTACHE_DOUBLE_QUOTED_ATTRIBUTE_NAME_STATE';
    } 

    else if (cp === $.APOSTROPHE) {
      this._createMustacheAttr();
      // this.currentMustacheAttr.quotedName = true;
      this.state = 'MUSTACHE_SINGLE_QUOTED_ATTRIBUTE_NAME_STATE';
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file after mustache tag name");
    }

    else if (cp === $.EQUALS_SIGN) {
      throw this._buildSyntaxError("Cannot assign values to a mustache tag name");
    }

    // Get the identifier
    else {
      this._createMustacheAttr();
      this._createMustacheIdentifier();
      this.prevState.push('AFTER_MUSTACHE_ATTRIBUTE_NAME_STATE');
      this._reconsumeInState('MUSTACHE_IDENTIFIER_STATE');      
    }
  },

  MUSTACHE_SINGLE_QUOTED_ATTRIBUTE_NAME_STATE: function(cp) {

    if (cp === $.APOSTROPHE) {
      this._leaveMustacheAttrName('MUSTACHE_ATTRIBUTE_NAME_STATE');
    }

    else if (cp === $.NULL) {
      this.currentMustacheAttr.name += UNICODE.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
      this._reconsumeInPrevState();
    }

    else {
      this.currentMustacheAttr.name += toChar(cp);
    }    
  },

  MUSTACHE_DOUBLE_QUOTED_ATTRIBUTE_NAME_STATE: function(cp) {
    if (cp === $.QUOTATION_MARK) {
      this._leaveMustacheAttrName('MUSTACHE_ATTRIBUTE_NAME_STATE');
    }

    else if (cp === $.NULL) {
      this.currentMustacheAttr.name += UNICODE.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
      this._reconsumeInPrevState();
    }

    else {
      this.currentMustacheAttr.name += toChar(cp);
    }
  },

  AFTER_MUSTACHE_ATTRIBUTE_NAME_STATE: function(cp) {

    // Ignore white spaces
    if (isWhitespace(cp)) {
      return;
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      this._leaveMustacheAttrName('MUSTACHE_CLOSE_STATE');
    }

    else if (cp === $.EQUALS_SIGN) {
      this._leaveMustacheAttrName('BEFORE_MUSTACHE_ATTRIBUTE_VALUE_STATE');

      if (this.currentMustacheAttr.nameType == Object) {
        // Validate left hand of attribute-value expressions are strings.
        if (this.currentMustacheAttr.namePath.length === 1) {
          this.currentMustacheAttr.nameType = String;
          this.currentMustacheAttr.name     = this.currentMustacheAttr.namePath[0];
          this.currentMustacheAttr.namePath = [];
        }
        // Do not allow {{ helper foo.bar=123 }}
        else {
          throw this._buildSyntaxError("Cannot assign values to a mustache tag name");
        }
      }
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file after mustache attribute name.");
    }

    else {
      this._leaveMustacheAttrName();
      this._reconsumeInState('MUSTACHE_ATTRIBUTE_NAME_STATE')
    }
  },

  BEFORE_MUSTACHE_ATTRIBUTE_VALUE_STATE: function(cp) {
    // Ignore white spaces
    if (isWhitespace(cp)) {
      return;
    }

    if (cp === $.QUOTATION_MARK) {
      this.state = 'MUSTACHE_ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE';
      //this.currentMustacheAttr.quotedVal = true;
    }

    else if (cp === $.APOSTROPHE) {
      this.state = 'MUSTACHE_ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE';
      //this.currentMustacheAttr.quotedVal = true;
    }

    else if (cp === $.MUSTACHE_OPEN) {
      throw this._buildSyntaxError("Found Mustache open character while expecting helper attribute value");
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      throw this._buildSyntaxError("Found Mustache close character while expecting helper attribute value");
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file while expecting helper attribute value");
    }

    else {
      this._createMustacheIdentifier();
      this.prevState.push('AFTER_MUSTACHE_ATTRIBUTE_VALUE_STATE');
      this._reconsumeInState('MUSTACHE_IDENTIFIER_STATE');
    }
  },

  MUSTACHE_ATTRIBUTE_VALUE_DOUBLE_QUOTED_STATE: function(cp) {
    if (cp === $.QUOTATION_MARK) {
      this.state = 'AFTER_MUSTACHE_ATTRIBUTE_VALUE_STATE';
    }

    else if (cp === $.NULL) {
      // this._addMustacheAttrValue(UNICODE.REPLACEMENT_CHARACTER);
      this.currentMustacheAttr.value += UNICODE.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file in double quoted attribute value");
    }

    else {
      // this._addMustacheAttrValue(toChar(cp));
      this.currentMustacheAttr.value += toChar(cp);
    }
  },

  MUSTACHE_ATTRIBUTE_VALUE_SINGLE_QUOTED_STATE: function(cp) {
    if (cp === $.APOSTROPHE) {
      this.state = 'AFTER_MUSTACHE_ATTRIBUTE_VALUE_STATE';
    }

    else if (cp === $.NULL) {
      // this._addMustacheAttrValue(UNICODE.REPLACEMENT_CHARACTER);
      this.currentMustacheAttr.value += UNICODE.REPLACEMENT_CHARACTER;
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file in single quoted attribute value");
    }

    else {
      // this._addMustacheAttrValue(toChar(cp));
      this.currentMustacheAttr.value += toChar(cp);
    }
  },

  AFTER_MUSTACHE_ATTRIBUTE_VALUE_STATE: function(cp) {
    // Ignore white spaces
    if (isWhitespace(cp)) {
      return;
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      this._leaveMustacheAttrValue('MUSTACHE_CLOSE_STATE');
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file after attribute value");
    }

    else {
      this._leaveMustacheAttrValue();
      this._reconsumeInState('MUSTACHE_ATTRIBUTE_NAME_STATE');
    }
  },

  AFTER_MUSTACHE_PARTIAL_NAME_STATE: function (cp) {
    var path;
    if (this.currentMustacheId) {
      path = this._leaveMustacheId();
      this._leaveMustacheTagName(path);
    }

    // Ignore white spaces
    if (isWhitespace(cp)) {
      return;
    }

    else if (cp === $.MUSTACHE_CLOSE) {
      this.state = 'MUSTACHE_CLOSE_STATE';
    }

    else if (cp === $.EOF) {
      throw this._buildSyntaxError("Unexpected end of file after partial name");
    }

    else {
      throw this._buildSyntaxError("Unexpected character '" + toChar(cp) + "' after partial name");
    }
  }
});

module.exports = Tokenizer;
