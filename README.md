# auto-complete.js

A vanilla JavaScript library to perform multiple autocomplete on **input**, **textarea**, and **contenteditable** elements or editors that are based on **textarea** or **contenteditable** elements, e.g. `codejar.js` editor.

## Features
-  Pure Vanilla Javascript
-  Zero Dependencies
-  Simple & Lightweight
-  Debounce Support

## Usage:

### HTML
``` html
`<link href="auto-complete.css" rel="stylesheet">`
`<script src="auto-complete.js"></script>`
```

**Important** the `auto-complete.js` should be instantiated before an editor. Otherwise, there will be a problem with `Enter` key in FireFox. 

``` js
new autoComplete(); // search for element with id `autocomplete`
const instance = new autoComplete(ctx, options);
```

The library allow to change contenteditable element without creating new instance. Can be useful for dynamically creating elements.
``` js
const instance = new autoComplete(ctx, options);
instance.reRegisterElement(selector or HTMLElement);
```

### Parameters:
* `ctx` - an HTMLElement or CSS selector string
* `options` - the optional object :
  * `suggestions` - an array of suggestion strings.
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
    
  * `caseSensitive` - a boolean value that defines string comparison (default is `false`).
  * `threshold` - a number of typed characters that trigger suggestion process (default is `1`).

  * `wholeMatch` {boolean} - whether to search in the `suggestions` array for whole match (trigger characters and typed string (default is `false`).
    Using this trick can reduce number of garage suggestions especially in large array, e.g. CSS psudo classes start with `:` character; if this is added  `:first-child`

  * `maxResults` - a number of items in suggestion list (default is `10`).

  * `listTagName` - an element tag name of a suggestion list (default is `ul`).
  * `listClass` - an element class name of a suggestion list (default is `autocomplete-list`).
  * `listItemTagName` - an element tag name of suggestion list item (default is `li`).
  * `listItemClass` - an element class name of suggestion list item (default is `autocomplete-item`).

  * `filter : (results) => {}` {function} - A callback on getting suggestion results
    * `results` {object} - the array of objects containing suggestion information:
      * `value` {string} - the original suggestion string to be added to suggestion list
      * `insert` {string} - the part of original suggestion string to be inserted into an editor
    
  * `debug` {boolean} - log to the console internal messages (default is `false`).
  
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
