# auto-complete.js

A vanilla JavaScript library to perform multiple autocomplete on **input**, **textarea**, and **contenteditable** elements or editors that are based on **textarea** or **contenteditable** elements, e.g. `codejar.js` editor.

## Description

It design in mind to work with large arrays of suggestion, e.g. language dictionaries.  
A `startsWith` option allow to boost searching by splitting array into smaller ones that starts with one or two characters.

Due to using RegExp as a condition checker it's highly adjustable.  

## Features
-  Pure Vanilla JavaScript
-  Zero Dependencies
-  Lightweight
-  Optimize Search Feature
-  Debounce Support

## Usage:

### HTML
``` html
`<link href="/auto-complete.css" rel="stylesheet">`
`<script src="/auto-complete.js"></script>`
```

**Important** the `auto-complete.js` should be instantiated before an editor. Otherwise, there will be a problem with `Enter` and `Tab` keys in FireFox. 

``` js
new autoComplete(); // search for element with id `autocomplete`
const instance = new autoComplete(ctx, options);
```

The library allow to change context element without creating new instance. Can be useful for dynamically creating elements.
``` js
const instance = new autoComplete(ctx, options);
instance.reRegisterElement(selector or HTMLElement);
```

### Parameters:
* `ctx` - an HTMLElement or CSS selector string
* `options` - the optional object :
  * `suggestions` - an array of suggestion strings or an object having string keys and values that are arrays of strings starting with these keys.  
    When suggestions is an object, it should be compliant with `threshold` and `caseSensitive` options,  
    e.g. if option `threshold: 1` the object key must be a single character, `threshold: 2` - two characters ... 

  * `triggerChars` - a string of characters or an array of string that triggers suggestion list (optional).  
    Array allows to use any combination of characters as a trigger.  
    Unicode class `\p{..}, \u{..}` or a special RegExp characters `\n\t\s\W\D` also can be used.  
    If there is requirement for autocomplete from the beginning of an editor, the first array item should be '^' character.  
    If a custom RegExp is provided, this option ignored.
    
  * `queryChars` - a string of query characters (optional);  
    Unicode class `\p{..}, \u{..}` or a special RegExp characters `\w\d\D\S` also can be used.  
    If a custom RegExp is provided, this option ignored.
    
  * `regex` - a custom RegExp; must contain two capturing groups: the first must specify trigger characters, the second - query characters.  
    A simple dot autocomplete regex: `/([.])([\w\d]+)$/`  
    As a trigger can be used a word or combination characters, e.g. `/(name: *)([\p{L}]*)$/iu` trigger autocomplete only after `name:`.
    
  * `optimize` {boolean} - whether to optimize the `suggestions` array to speed up searching (default is `false`).
    **Note** that it only available with `startsWith: true` option.  
    It's create an object with keys that are (depend on a `threshold` and `caseSensitive` options) the start character(s) of array string and values that are arrays of strings starting with these keys.  
    Thus, instead of looping through whole `suggestions` array, it's search for suggestions in significantly smaller array.
    
  * `startsWith` {boolean} - whether to search starts with (default is `false`).
  * `caseSensitive` {boolean} - whether to search case sensitive (default is `false`).

  * `threshold` - a number of typed characters that trigger suggestion process (default is `1`).
  * `highlight` {boolean} - whether to highlight matching in suggestion list (default is `false`).
  * `maxResults` - a number of items in suggestion list (default is `10`).

  * `listTag` {string} - an element tag name of suggestion list (default is `ul`).
  * `listClass` {string} - an element class name of suggestion list (default is `autocomplete-list`).
  * `listItemTag` {string} - an element tag name of suggestion list item (default is `li`).
  * `listItemClass` {string}  - an element class name of suggestion list item (default is `autocomplete-item`).
  * `listOffsetY` {number} - a vertical offset of suggestion list (default is `5`).
  * `listOffsetX` {number} - a horizontal offset of suggestion list (default is `5`).

  * `filter : (results) => {}` {function} - A callback on getting suggestion results; 
    * `results` {object} - the array of objects containing suggestion information:
      * `text` {string} - the original suggestion string to be added to suggestion list as list item text content
      * `value` {string} - the suggestion string prepared for comparison (depend on `caseSensitive` option)
      * `query` {string} - the query string prepared for comparison (depend on `caseSensitive` option)
      * `startIndex` {number} - the start index of this `query` substring in this `value` string
   
  * `sort` {boolean} - whether to sort a suggestion list by ascending order of the `startIndex` and place exact match as first item (default is `false`).
    It only make sense with `startsWith:  false`.
    The sorting performs after custom `filter()` callback, if any, before building the suggestion list.
        
  * `listItem : (element, data) => {}` {function} - A callback on creation of suggestion list item:
    * `element` {HTMLelement} - a list item element with necessary attributes
    * `data` {object} - an object containing suggestion information:
      * `text` {string} - the original suggestion string to be added to suggestion list as list item text content
      * `value` {string} - the suggestion string prepared for comparison (depend on `caseSensitive` option)
      * `query` {string} - the query string prepared for comparison (depend on `caseSensitive` option)
      * `startIndex` {number} - the start index of this `query` substring in this `value` string
    The value of attribute 'data-text' can be safely modify (value is a typing replacer), but don't change 'data-query'.  
    The highlighting performs just before this callback, if`highlight: true`.

    
  * `debug` {boolean} - logs to the console internal messages (default is `false`).
  
  The default options:
  ``` js
  const options = {
    suggestions : [],
    queryChars : '\\d\\p{L}_-', // all Unicode letter, 0-9 digits and `_-`
	triggerChars : '\\s$+<=>^`|~\\p{P}', // all Unicode punctuation characters plus `\\s$+<=>^`|~`
	regex : `/(^|[\s$+<=>^`|~\p{P}])([\d\p{L}_-]+)$/u`,  // 
	caseSensitive : false,
	debounce : 0,
	threshold : 1,
	maxResults : 10,
	filter : () = {},
	debug : false,
  };
  ```
