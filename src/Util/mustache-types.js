/**
 * Enumeration with all supported mustache/handlebars node types
 */
var TMUSTACHE = module.exports = {
  TAG: 1,             //  {{IDENTIFIER}}
  HELPER: 2,          //  {{IDENTIFIER [IDENTIFIER] [KEY=IDENTIFIER]}}
  BLOCK_OPEN: 3,      //  {{#IDENTIFIER}}
  BLOCK_INV_OPEN: 4,  //  {{^IDENTIFIER}}
  BLOCK_CLOSE: 5,     //  {{/IDENTIFIER}}
  BLOCK_IF_OPEN: 6,   //  {{#if IDENTIFIER}} {{unless IDENTIFIER}}
  BLOCK_ELSE: 7,      //  {{else}}
  BLOCK_IF_CLOSE: 8,  //  {{/if}} {{/unless}}
  PARTIAL: 9,         //  {{> IDENTIFIER}}
  // NOT Supported  
  // ESCAPED_TAG: 10,    // {{&IDENTIFIER}}, {{{IDENTIFIER}}}
};
