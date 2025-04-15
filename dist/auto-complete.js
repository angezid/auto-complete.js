/*!*************************************************
* auto-complete.js 1.0.0
* https://github.com/angezid/auto-complete.js
* MIT licensed
* Copyright (c) 2025, angezid
**************************************************/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.autoComplete = factory());
})(this, (function () { 'use strict';

  function _extends() {
    return _extends = Object.assign ? Object.assign.bind() : function (n) {
      for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e];
        for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
      }
      return n;
    }, _extends.apply(null, arguments);
  }

  var regExpCreator = {
    create: function create(opt, libName) {
      var queryChars = this.preprocess(opt.queryChars),
        queryPattern = "([".concat(queryChars, "]+)");
      var chars = this.preprocess(opt.triggerChars),
        triggerPattern = '(^|[' + chars + ']+)';
      if (opt.debug) {
        console.log(libName + ": RegExp trigger pattern - " + triggerPattern, ' query pattern - ' + queryPattern);
      }
      return new RegExp("".concat(triggerPattern).concat(queryPattern, "$"), 'u');
    },
    preprocess: function preprocess(value) {
      var _this = this;
      if (value && value.length) {
        var array = value.split(/(\\[pPu]\{[^}]+\}|\\[swdSWDnt]|.)/).filter(function (s) {
          return s.length;
        });
        return array.map(function (str, i) {
          return _this.noEscape(str, i) ? str : _this.escapeCharSet(str);
        }).join('');
      }
      return '';
    },
    noEscape: function noEscape(str, i) {
      return i === 0 && str === '^' || str.length > 4 || /\\[swdSWDnt]/.test(str);
    },
    escapeCharSet: function escapeCharSet(str) {
      return str.replace(/[-^\]\\]/g, '\\$&');
    }
  };

  var contentEditable = {
    caretCoordinates: null,
    getText: function getText(elem) {
      var rng = this.getSelection(elem).getRangeAt(0),
        range = document.createRange();
      range.selectNodeContents(elem);
      range.setEnd(rng.startContainer, rng.startOffset);
      var rect = rng.getBoundingClientRect();
      if (rect.x === 0 && rect.y === 0) {
        rect = rng.startContainer.getBoundingClientRect();
      }
      this.caretCoordinates = rect;
      return range.toString();
    },
    replace: function replace(elem, query, text) {
      var len = this.getText(elem).length;
      this.select(elem, len - query.length, len);
      var obj = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\'': '&#039;'
      };
      document.execCommand('insertHTML', false, text.replace(/[<>&"']/g, function (m) {
        return obj[m];
      }));
    },
    select: function select(elem, start, end) {
      var selection = this.getSelection(elem);
      var startNode,
        endNode,
        startOffset = 0,
        endOffset = 0,
        previous = 0,
        node;
      var iterator = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT);
      while (node = iterator.nextNode()) {
        if (node.nodeValue) {
          var current = previous + node.nodeValue.length;
          if (!startNode && current > start) {
            startNode = node;
            startOffset = start - previous;
          }
          if (!endNode && current >= end) {
            endNode = node;
            endOffset = end - previous;
            break;
          }
          previous = current;
        }
      }
      if (startNode && endNode) {
        selection.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
      }
    },
    getSelection: function getSelection(elem) {
      return elem.getRootNode().getSelection();
    }
  };

  function createElement(parent, name, className, content) {
    var elem = document.createElement(name);
    if (className) elem.setAttribute('class', className);
    if (content) elem.textContent = content;
    parent.appendChild(elem);
    return elem;
  }

  var textarea = {
    caretCoordinates: null,
    getText: function getText(elem) {
      var caretIndex = elem.selectionStart,
        text = elem.value.substr(0, caretIndex);
      this.caretCoordinates = this.getCaretCoordinates(elem, caretIndex);
      return text;
    },
    replace: function replace(elem, query, text) {
      var value = elem.value,
        index = elem.selectionStart,
        queryIndex = index - query.length;
      elem.value = value.substr(0, queryIndex) + text + value.substr(index);
      elem.selectionStart = elem.selectionEnd = queryIndex + text.length;
    },
    getCaretCoordinates: function getCaretCoordinates(elem, caretIndex) {
      var rect = elem.getBoundingClientRect(),
        isInput = elem instanceof HTMLInputElement,
        text = elem.value,
        len = text.length,
        content = text.substring(0, caretIndex),
        style = window.getComputedStyle(elem),
        div = createElement(document.body, 'div', null, isInput ? content.replace(/\s/g, "\xA0") : content),
        span = createElement(div, 'span', null, text.substr(caretIndex, len - caretIndex > 50 ? 50 : len) || '.');
      var properties = ['direction', 'boxSizing', 'textAlign', 'textAlignLast', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'wordBreak', 'overflowX', 'overflowY', 'tabSize'];
      properties.forEach(function (prop) {
        div.style[prop] = style.getPropertyValue(prop);
      });
      var props = {
        width: style.width,
        wordWrap: "normal",
        whiteSpace: "pre-wrap"
      };
      _extends(div.style, {
        position: "absolute",
        visibility: "hidden",
        top: rect.top + "px",
        left: rect.left + "px",
        font: style.font,
        padding: style.padding,
        border: style.border
      }, !isInput ? props : {});
      var fontSize = parseInt(style.fontSize),
        height = fontSize + fontSize / 2,
        top = rect.top + span.offsetTop - (elem.scrollHeight > elem.clientHeight ? elem.scrollTop : 0) + parseInt(style.borderTopWidth),
        left = rect.left + span.offsetLeft - (elem.scrollWidth > elem.clientWidth ? elem.scrollLeft : 0) + parseInt(style.borderLeftWidth) - 1;
      document.body.removeChild(div);
      return {
        top: top,
        left: left,
        height: height
      };
    }
  };

  var diacritics = {
    chars: ['aàáảãạăằắẳẵặâầấẩẫậäåāą', 'cçćč', 'dđď', 'eèéẻẽẹêềếểễệëěēę', 'iìíỉĩịîïī', 'lł', 'nñňń', 'oòóỏõọôồốổỗộơởỡớờợöøōő', 'rř', 'sšśșş', 'tťțţ', 'uùúủũụưừứửữựûüůūű', 'yýỳỷỹỵÿ', 'zžżź'],
    obj: {},
    init: function init() {
      var _this = this;
      this.chars.forEach(function (str) {
        var low = str[0],
          upper = str[0].toUpperCase();
        for (var i = 1; i < str.length; i++) {
          _this.obj[str[i]] = low;
          _this.obj[str[i].toUpperCase()] = upper;
        }
      });
    },
    replace: function replace(str) {
      var _this2 = this;
      for (var i = 0; i < str.length; i++) {
        if (this.obj[str[i]]) {
          return str.split('').map(function (ch) {
            return _this2.obj[ch] || ch;
          }).join('');
        }
      }
      return str;
    }
  };

  function autoComplete(ctx, options) {
    this.ctx = ctx;
    this.options = options;
    this.newElement = function (ctx) {
      removeElementEvents();
      registerElement(ctx);
    };
    this.destroy = function (ctx) {
      removeElementEvents();
      removeEvents();
    };
    this.createIndexes = function (array) {
      return createIndexes(array);
    };
    var name = 'auto-complete',
      libName = 'auto-complete.js';
    var context,
      queryRegex,
      caretCoords,
      listbox,
      listSelector,
      isContentEditable,
      itemsLength = 0,
      selectedIndex = 0;
    var opt = _extends({}, {
      queryChars: '\\d\\p{L}_-',
      triggerChars: '\\s!"#$%&\'()*+,-./:;<=>?@[]\\^`{|}~',
      listTag: 'ul',
      listItemTag: 'li',
      listClass: name + '-list',
      listItemClass: name + '-item',
      listOffsetX: 5,
      listOffsetY: 5,
      debounce: 1,
      threshold: 1,
      maxResults: 100,
      debug: false
    }, this.options);
    context = registerElement(this.ctx);
    if (context) {
      createListbox();
      registerEvents();
      diacritics.init();
      listSelector = "".concat(opt.listTag, ".").concat(opt.listClass);
      queryRegex = opt.regex instanceof RegExp ? opt.regex : regExpCreator.create(opt, libName);
      log(libName + ': RegExp - /' + queryRegex.source + '/' + queryRegex.flags);
      if (opt.optimize && opt.startsWith) {
        createIndexes(opt.suggestions).then(function (obj) {
          opt.suggestions = obj;
        });
      }
    }
    function registerElement(ctx) {
      var elem = typeof ctx === 'string' ? document.querySelector(ctx) : ctx;
      if (elem) {
        isContentEditable = !(elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement);
        addEvent(elem, 'input', onInput);
        addEvent(elem, 'blur', hide);
        addEvent(elem, 'keydown', navigate);
      }
      return elem;
    }
    function createListbox() {
      listbox = createElement(document.body, opt.listTag, opt.listClass);
      addEvent(listbox, 'mousedown', function (e) {
        return e.preventDefault();
      });
      addEvent(listbox, 'click', listItemClick);
    }
    function listItemClick(e) {
      replaceQuery(e.target.closest(opt.listItemTag));
    }
    function registerEvents() {
      addEvent(window, 'load', hideLists);
      addEvent(window, 'resize', hide);
      addEvent(document, 'click', outsideClick);
    }
    function hideLists() {
      setTimeout(function () {
        document.querySelectorAll(listSelector).forEach(function (elem) {
          elem.style.display = 'none';
        });
      }, 20);
    }
    function outsideClick(e) {
      if (!listbox.contains(e.target)) hide();
    }
    function onInput() {
      debounce(process(), opt.debounce);
    }
    function process() {
      caretCoords = null;
      var obj = getQuery();
      if (obj && obj.query.length >= opt.threshold && caretCoords) {
        var array = getSuggestions(obj);
        if (isFunction(opt.filter) && array.length) {
          array = opt.filter(array) || array;
        }
        itemsLength = array.length;
        if (itemsLength) {
          if (!opt.startsWith && opt.sort) {
            sort(array, obj.query);
          }
          show(array);
          return;
        }
      }
      hide();
    }
    function sort(array, query) {
      query = getValue(query, true);
      array.sort(function (a, b) {
        return a.startIndex - b.startIndex;
      });
      var index = array.findIndex(function (obj) {
        return obj.startIndex === 0 && query === getValue(obj.value, true);
      });
      if (index > 0) {
        var temp = array[0];
        array[0] = array[index];
        array[index] = temp;
      }
    }
    function getQuery() {
      var obj = isContentEditable ? contentEditable : textarea,
        text = obj.getText(context);
      caretCoords = obj.caretCoordinates;
      var rm = queryRegex.exec(text);
      if (rm) {
        var groups = rm.groups;
        var trigger, query;
        if (groups && (query = groups.query)) {
          trigger = groups.trigger;
        } else if (query = rm[2]) {
          trigger = rm[1];
        }
        log("".concat(libName, ": trigger = '").concat(trigger, "' query = '").concat(query));
        return {
          trigger: trigger,
          query: query
        };
      }
      var len = text.length;
      log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
      return null;
    }
    function show(list) {
      var custom = isFunction(opt.listItem);
      listbox.innerHTML = '';
      list.forEach(function (data, i) {
        var text = data.text;
        var elem = createElement(listbox, opt.listItemTag, opt.listItemClass, text);
        if (opt.highlight) {
          var start = data.startIndex,
            end = start + data.query.length;
          elem.textContent = start > 0 ? text.substr(0, start) : '';
          createElement(elem, 'mark', null, text.substring(start, end));
          if (end < text.length) {
            elem.appendChild(document.createTextNode(text.substr(end)));
          }
        }
        if (custom) {
          opt.listItem(elem, data);
        }
        var json = JSON.stringify(data).replaceAll('"', '&#34;');
        elem.setAttribute('data-json', json);
      });
      var rect = getListPlacement();
      listbox.style.top = rect.top + 'px';
      listbox.style.left = rect.left + 'px';
      listbox.scrollTop = 0;
      selectedIndex = -1;
    }
    function hide() {
      listbox.innerHTML = '';
      listbox.style.display = 'none';
    }
    function navigate(e) {
      var key = e.key;
      if (key === 'Escape') {
        hide();
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        previous();
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        next();
      } else if (key === 'Enter' || key === 'Tab') {
        if (e.defaultPrevented) return;
        var selected = listbox.querySelector('.selected');
        if (selected) {
          e.preventDefault();
          selected.click();
        }
      }
    }
    function next() {
      selectedIndex = selectedIndex >= itemsLength - 1 ? 0 : selectedIndex + 1;
      update();
    }
    function previous() {
      selectedIndex = selectedIndex <= 0 ? itemsLength - 1 : selectedIndex - 1;
      update();
    }
    function update() {
      var items = document.querySelectorAll("".concat(listSelector, " > ").concat(opt.listItemTag));
      items.forEach(function (item, index) {
        item.classList.toggle('selected', index === selectedIndex);
      });
      var selectedItem = items[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
    function createIndexes(array) {
      return new Promise(function (resolve, reject) {
        array = array.slice();
        array.sort();
        var i = opt.threshold;
        var obj = {},
          num = Math.max(i + 1, 4);
        var _loop = function _loop() {
          var start = -1,
            prev;
          while (++start < array.length && !(prev = getKey(array[start], i)));
          array.forEach(function (str, k) {
            var key = getKey(str, i);
            if (key && key !== prev) {
              obj[prev] = add(obj[prev], start, k);
              start = k;
              prev = key;
            }
          });
          obj[prev] = add(obj[prev], start, array.length);
        };
        for (i; i < num; i++) {
          _loop();
        }
        function add(arr, start, end) {
          if (!arr) arr = [];
          arr.unshift([start, end]);
          return arr;
        }
        resolve({
          array: array,
          indexes: obj
        });
      });
    }
    function getIndexes(str, indexes) {
      var num = Math.min(opt.threshold + 1, str.length);
      for (var r = num; r >= 1; r--) {
        var key = getKey(str, r),
          array = indexes[key];
        if (array) return array;
      }
      return null;
    }
    function getKey(str, num) {
      return str.length < num ? null : getValue(str.substr(0, num));
    }
    function getSuggestions(obj) {
      var results = [],
        query = getValue(obj.query),
        startsWith = opt.startsWith,
        suggestions = opt.suggestions;
      var count = 0;
      if (Array.isArray(suggestions)) {
        collect(suggestions, 0, suggestions.length);
      } else {
        var indexes = suggestions['indexes'],
          array = getIndexes(query, indexes);
        if (!array) {
          log(libName + ': Array of indexes is undefined for ', obj.query);
          return results;
        }
        array.forEach(function (arr) {
          collect(suggestions['array'], arr[0], arr[1]);
        });
      }
      function collect(array, i, length) {
        for (i; i < length; i++) {
          var text = array[i],
            index = getValue(text).indexOf(query);
          if (startsWith ? index === 0 : index >= 0) {
            if (++count >= opt.maxResults) break;
            results.push({
              text: text,
              query: obj.query,
              trigger: obj.trigger,
              startIndex: index
            });
          }
        }
      }
      log(libName + ': Suggestion count =', results.length);
      return results;
    }
    function getValue(str, normal) {
      if (!str) return '';
      str = opt.caseSensitive ? str : str.toLowerCase();
      return normal ? str : diacritics.replace(str);
    }
    function getListPlacement() {
      listbox.style.display = 'block';
      var rect = listbox.getBoundingClientRect(),
        listX = opt.listOffsetX,
        listY = opt.listOffsetY,
        offsetY = window.pageYOffset,
        offsetX = window.pageXOffset,
        right = offsetX + window.innerWidth - 20,
        bottom = offsetY + window.innerHeight - 20;
      var top = caretCoords.top + caretCoords.height + offsetY,
        left = caretCoords.left + offsetX;
      if (top + rect.height > bottom) {
        top = top - rect.height - caretCoords.height - listY;
      } else top += listY;
      if (left + rect.width > right) {
        left = left - rect.width - listX;
      } else left += listX;
      return {
        top: top,
        left: left
      };
    }
    function replaceQuery(elem) {
      var json, text;
      if (!elem || !(json = elem.getAttribute('data-json'))) return;
      var data = JSON.parse(json.replaceAll('&#34;', '"'));
      text = data.text;
      if (isFunction(opt.select)) {
        text = opt.select(data);
      }
      if (isContentEditable) {
        contentEditable.replace(context, data.query, text);
      } else {
        textarea.replace(context, data.query, text);
      }
      hide();
    }
    function isFunction(obj) {
      return typeof obj === 'function';
    }
    function debounce(callback, duration) {
      var id;
      return function () {
        clearTimeout(id);
        id = setTimeout(function () {
          callback();
        }, duration);
      };
    }
    function log(msg) {
      if (opt.debug) {
        console.log(Array.from(arguments).join(' '));
      }
    }
    function removeElementEvents() {
      if (context) {
        remove(context, 'input', onInput);
        remove(context, 'blur', hide);
        remove(context, 'keydown', navigate);
      }
    }
    function removeEvents() {
      remove(document, 'click', outsideClick);
      remove(window, 'resize', hide);
      remove(window, 'load', hideLists);
      if (listbox) document.body.removeChild(listbox);
    }
    function addEvent(elem, type, fn) {
      elem.addEventListener(type, fn);
    }
    function remove(elem, type, fn) {
      elem.removeEventListener(type, fn);
    }
    return this;
  }

  return autoComplete;

}));
