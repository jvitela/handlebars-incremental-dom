# handlebars-incremental-dom
Handlebars to Incremental DOM transpiler

How to debug  
-------------
$> node --inspect --debug-brk compiler.js

TODO
-----
-   Template comments with {{!-- --}} or {{! }}
-   Else If statements:

      {{#if foo5}} ipsum {{else if foo6}} dolor {{else}} est {{/if}}

-   Else and Chained else statements for helpers

      {{#myif isActive}} Active {{else myif isDisabled}} Disabled {{else}} Enabled {{/myif}}

-   Helper Subexpressions: 

      {{outer-helper (inner-helper 'abc') 'def'}}

LOW PRIORITY
------------
-   Else on each statements
      
      {{#each paragraphs}}
        <p>{{this}}</p>
      {{else}}
        <p class="empty">No content</p>
      {{/each}}

-   Block Parameters:

      {{#each users as |user userId|}}
        Id: {{userId}} Name: {{user.name}}
      {{/each}}
      {{#block-params 1 2 3 as |foo bar baz|}}
        {{foo}} {{bar}} {{baz}}
      {{/block-params}}

-   The lookup helper

      {{#each bar}}
        {{lookup ../foo @index}}
      {{/each}}

-   The log block helper

      {{log "Look at me!"}}

-   The blockHelperMissing helper
-   The helperMissing helper

WILL NOT SUPPORT
----------------
-   Unescaped values {{{foo}}}, {{&foo}}
-   The with Block Helper

      {{#with author}}
        <h2>By {{firstName}} {{lastName}}</h2>
      {{/with}}

-   Whitespace Control

      {{#each nav ~}}
      <a href="{{url}}">
        {{~#if test}}
          {{~title}}
        {{~^~}}
          Empty
        {{~/if~}}
      </a>
      {{~/each}}

-   Else alias {{^}}
-   Raw Blocks

      {{{{raw-helper}}}}
      	{{bar}}
      {{{{/raw-helper}}}}

-   Handlebars.SafeString in helpers
-   Dynamic Partials

      {{> (whichPartial) }}
      {{> (lookup . 'myVariable') }}

-   Partial Contexts

      {{> myPartial myOtherContext }}

-   Partial Parameters

      {{> myPartial parameter=value }}

-   Partial Blocks

      {{#> myPartial }} Failover content {{/myPartial}}

-   Inline Partials

      {{#*inline "myPartial"}}
      	My Content
      {{/inline}}
