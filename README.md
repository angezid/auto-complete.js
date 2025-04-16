# auto-complete.js

A vanilla JavaScript library to perform multiple autocomplete on **input**, **textarea**, and **contenteditable** elements or editors that are based on **textarea** or **contenteditable** elements.  
It design in mind to work with large arrays of suggestion, e.g. language dictionaries.

## Description

When user is typing in an editable element, the library checks for the specified trigger character(s) and following (query) character(s) (control by RegExp).  
If condition is met (involve `threshold` opt.), it performs searching (affected by `maxResults` opt.) in provided suggestion array. If searching succeeds, it displays a suggestion list.  
When desired item is clicked, the *query* part is replaced by the suggestion (can be change on `select` callback).

It has the two searching mode:
* starts with typed sequence
* contains typed sequence

A `startsWith` option allow to boost searching by indexing a suggestions array (see the `optimize` option).  
Thus, instead of looping through whole array, it's search for suggestions within start and end indexes of the array.

## Features
-  Pure Vanilla JavaScript
-  Zero Dependencies
-  Lightweight
-  Optimize Search Feature
-  Debounce Support

## Usage:

### HTML
``` html
<link href="../auto-complete.css" rel="stylesheet">
<script src="../auto-complete.js"></script>
```

### Examples

``` js
const instance = new autoComplete(ctx, options);
```

Example of using the `select` callback
``` js
new autoComplete(selector, {
    suggestions: dictionary,
    startsWith: true,
    select : (data) => {
        // way to keep original typed sequence with 'startsWith' option
        return data.query + data.text.substr(data.query.length);
        
        // translates the first letter of suggestion to uppercase at the start of an editor
        // or after '.?!' characters regardless of the 'startsWith' option
        if (/(?:^|[.?!])\s*/.test(data.trigger)) {
            return data.text.charAt(0).toUpperCase() + data.text.substr(1);
        }
        return data.text;
    }
});
```
The library allows to change context element without creating a new instance. Can be useful for dynamically creating elements.
``` js
const instance = new autoComplete(ctx, options);
. . .
instance.newElement(selector or HTMLElement);
```

## Troubleshooting
There can be some problems adding autocomplete to existing editors, e.g.: 
* `codejar.js` - the `auto-complete.js` should be instantiated before an editor. Otherwise, there will be a problem with `Enter` and `Tab` keys in FireFox.

* `codeflask` - as it dynamically creates a `textarea` element, so there is no possibility to instantiate `auto-complete.js` first. In addition it requires to fire some `KeyboardEvent` to update text changes in overlay `pre` element (see `event` option). `Enter` and `Tab` keys won't work on suggestion list.

## Parameters:
* `ctx` - an HTMLElement or CSS selector string
* `options` - the object:
  * `suggestions` - an array of suggestion strings or an object that is created by `createIndexes(array)` API. 
    The library instance should be compliant with `threshold` and `caseSensitive` option.
  
  * `triggerChars` - a string of characters that triggers suggestion list (optional).  
    Unicode class `\p{..}, \u{..}` or a special RegExp characters `\s\W\D\n\t` also can be used.  
    If the first character is '^', the internal RegExp character set logic is switch to negation.  
    If a custom RegExp is provided, this option ignored.
  
  * `queryChars` - a string of query characters (optional);  
    Unicode class `\p{..}, \u{..}` or a special RegExp characters `\w\d\D\S` also can be used.  
    If the first character is '^', the internal RegExp character set logic is switch to negation.  
    If a custom RegExp is provided, this option ignored.
  
  * `regex` - a custom RegExp; must contain two capturing groups: the first must specify trigger characters, the second - query characters, and ended by `$` character.  
    It also allow to use two named capturing groups: `/(?<trigger>...)(?<query>...)$/`.  
    A simple dot autocomplete regex: `/([.])([\w\d]+)$/`.  
    As a trigger can be any combination of characters, e.g. `/(name: *)([\p{L}]+)$/iu` triggers autocomplete only after `name:`.
  
  * `optimize` {boolean} - whether to optimize the `suggestions` array to speed up searching (default is `false`).  
    **Note** that it only available with `startsWith: true` option.  
    It's create start and end indexes for the first characters (depend on `threshold` option), e.g.  
    `threshold: 1` - [1,1-2,1-3], `threshold: 2` - [1-2,1-3], `threshold: 3` - [1-3], `threshold: 4` - [1-4] ...
  
  * `startsWith` {boolean} - whether to search starts with (default is `false`). The default searching mode is `contains typed sequence`.
  * `caseSensitive` {boolean} - whether to search case sensitive (default is `false`).
  
  * `threshold` - a number of typed characters that trigger suggestion process (default is `1`).
  * `highlight` {boolean} - whether to highlight matching in suggestion list (default is `false`).
  * `maxResults` - a number of items in suggestion list (default is `100`).  
    **Note** that searching is stopped, when it reaches `maxResults`.
  
  * `listTag` {string} - an element tag name of suggestion list (default is `ul`).
  * `listClass` {string} - an element class name of suggestion list (default is `autocomplete-list`).
  * `listItemTag` {string} - an element tag name of suggestion list item (default is `li`).
  * `listItemClass` {string}  - an element class name of suggestion list item (default is `autocomplete-item`).

  * `listOffsetY` {number} - a vertical offset of suggestion list (default is `5`).
  * `listOffsetX` {number} - a horizontal offset of suggestion list (default is `5`).  
    The suggestion list is flipped vertically or horizontally if it does not fit the window. These options are kept offsets on flipping.
  
  * `filter : (results) => {}` {function} - A callback on getting suggestion results;  
    **Note** that it must return results, if a new array is created on filtering.
    * `results` {array} - the array of objects containing suggestion information; an item is an object with these properties:
      * `text` {string} - the original suggestion string to be added to suggestion list as list item text content
      * `query` {string} - the original query string
      * `startIndex` {number} - the start index of a query substring in suggestion string
  
  * `sort` {boolean} - whether to sort a suggestion list by ascending order of the `startIndex` and place exact match as first item (default is `false`).  
    It only make sense with `startsWith: false` option.  
    The sorting performs after custom `filter()` callback, if any, before building the suggestion list.
  
  * `listItem : (element, data) => {}` {function} - A callback on creation of suggestion list item:  
    The highlighting is performed just before this callback, if `highlight: true`.
    * `element` {HTMLelement} - a list item element
    * `data` {object} - an object containing suggestion information:  
      The `data` object is converted **after** this callback to JSON string and added to this `element` as the value of the attribute 'data-json'.
      * `text` {string} - the original suggestion string to be added to suggestion list as list item text content
      * `query` {string} - the original query string; **do not change** the query length!
      * `trigger` {string} - the trigger string
      * `startIndex` {number} - the start index of a query substring in suggestion string
    
  * `select : (data) => {}` {function} - A callback on selecting list item; **must return a string**: 
    * `data` {object} - an object containing suggestion information:
      * `text` {string} - the original suggestion string
      * `query` {string} - the original query string; **do not change** the query length!
      * `trigger` {string} - the trigger string
      * `startIndex` {number} - the start index of a query substring in suggestion string
  
  * `event` {KeyboardEvent} - a event, that should be fired, when a suggestion is added to context element, in order to force an editor to update (default is `undefined`),
    e.g. `event : new KeyboardEvent("input", { bubbles : true })`  
    **Note** that it's only may require for some editors (see [Troubleshooting](#troubleshooting)).
  
  * `debug` {boolean} - logs to the console internal messages (default is `false`).
  
  The default options:
  ``` js
  const options = {
    suggestions : [],
    queryChars : '\\d\\p{L}_', // all Unicode letter, 0-9 digits and `_`
    triggerChars : '\\s!"#$%&\'()*+,-./:;<=>?@[]\\^`{|}~`, // white spaces and punctuation
    regex : `/(^|[\s!"#$%&'()*+,\-./:;<=>?@[\]\\\^`{|}~]+)([\d\p{L}_]+)$/u`,
    caseSensitive : false,

    listTag : 'ul',
    listItemTag : 'li',
    listClass : 'auto-complete-list',
    listItemClass : 'auto-complete-item',
    listOffsetX : 5,
    listOffsetY : 5,

    debounce : 1,
    threshold : 1,
    maxResults : 100,
    // filter : () = {},
    // listItem : (elem, data) => {},
    // select : (data) => {},
    debug : false,
  };
  ```

### License

[MIT](LICENSE)
