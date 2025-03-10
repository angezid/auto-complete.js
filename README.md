# auto-complete.js

A simple vanilla JavaScript library to perform auto completion in *contenteditable elements* or editors that are based on *contenteditable element*, e.g. `codejar.js` editor.

## Usage:
### HTML
`<link href="auto-complete.css" rel="stylesheet">`
`<script src="auto-complete.js"></script>`

**Important** the `auto-complete.js` should be instantiated before an editor. Otherwise there will be problem with `Enter` key in FireFox. 

``` js
const instance = new autoComplete(ctx, options);
```

### Parameters:
* `ctx` - an HTMLElement or CSS selector string
* `options` - the optional object :
  * `suggestions` - an array of suggestion strings
  * `triggerChars` - a custom string of characters that trigger suggestion list. If a custom RegExp is provided this option ignored.
  * `queryChars` - a custom string of query characters; can be used Unicode class `\p{...}` or a special RegExp `\w\W\d\D\S`. If a custom RegExp is provided this option ignored.
  * `regex` - a custom RegExp; must contain two capturing groups: first must specified trigger characters, second - query characters.
    A simple dot auto completion regex: `/([.])([\w\d]+)$/i`
    As a trigger can be used a word, e.g. `/(name: *)([\p{L}]*)$/iu` trigger auto completion only after `name:`.
    
  * `ignoreCase` - a boolean value that specified how to perform searching: `false` value trigger case sensitive comparison.
  * `threshold` - a number of characters that trigger suggestion process
  * `maxResults` - a number of items in suggestion list
  * `debug` - log to the console internal messages
  
  The default options:
  ``` js
  const options = {
    suggestions : [],
    queryChars : '\\d\\p{L}', // all Unicode letter and 0-9 digits
	triggerChars : '\\s$+<=>^`|~\\p{P}', // all Unicode punctuation characters plus `\\s$+<=>^`|~`
	regex : `/(^|[\s$+<=>^`|~\p{P}])([\d\p{L}]+)$/u`,  // 
	ignoreCase : true,
	debounce : 0,
	threshold : 1,
	maxResults : 10,
	debug : false,
  };
  ```
