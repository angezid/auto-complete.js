
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory(root));

	} else if (typeof exports === 'object') {
		module.exports = factory(root);

	} else {
		root.autoComplete = factory(root);
	}
})(typeof global !== "undefined" ? global : this.window || this.global, function(root) {
	'use strict';

	function autoComplete(ctx, options) {
		this.ctx = ctx;
		this.options = options;

		this.reRegisterElement = function(ctx) {
			removeElementEvents();
			registerElement(ctx)
		}

		this.destroy = function(ctx) {
			removeElementEvents();
			removeEvents();
		}

		this.optimize = function(array) {
			return optimize(array);
		}

		const name = 'autocomplete',
			libName = 'auto-complete.js';

		let element,
			queryRegex,
			regexSource,
			listbox,
			isText,
			isInput,
			caretRect,
			itemLength = 0,
			selectedIndex = 0;

		const opt = Object.assign({}, {
			suggestions : [],
			queryChars : '\\d\\p{L}_-',
			//queryChars : '\\S',
			triggerChars : '\\s$+<=>^`|~\\p{P}',
			regex : null,
			listTagName : 'ul',
			listItemTagName : 'li',
			listClass : name + '-list',
			listItemClass : name + '-item',
			listOffsetX : 5,
			listOffsetY : 5,
			caseSensitive : false,
			wholeMatch : true,
			debounce : 1,
			threshold : 1,
			maxResults : 15,
			//filter : () => {},
			debug : false,
		}, this.options);

		queryRegex = (opt.regex instanceof RegExp) ? opt.regex : regExpCreator.create(opt, libName);
		log(libName + ': query RegExp - /' + queryRegex.source + '/' + queryRegex.flags);

		element = registerElement(this.ctx);
		createListbox();
		registerEvents();

		if (opt.optimize) {
			opt.suggestions = optimize(opt.suggestions);
		}

		function registerElement(ctx) {
			const elem = typeof ctx === 'string' ? document.querySelector(ctx || '#' + name) : ctx;

			isText = ((isInput = elem instanceof HTMLInputElement) || elem instanceof HTMLTextAreaElement);

			addEvent(elem, 'input', onInput);
			addEvent(elem, 'blur', hide);
			addEvent(elem, 'keydown', navigateList);
			return elem;
		}

		function createListbox() {
			listbox = createElement(opt.listTagName, opt.listClass);
			document.body.appendChild(listbox);
			addEvent(listbox, 'mousedown', (e) => e.preventDefault());
			addEvent(listbox, 'click', listItemClick);
		}

		function listItemClick(e) {
			insert(e.target.getAttribute('data-insert'));
		}

		function createElement(name, klass) {
			let elem = document.createElement(name);
			if (klass) elem.setAttribute('class', klass);
			return elem;
		}

		function registerEvents() {
			addEvent(window, 'beforeunload', (e) => { caretRect = null; });    // ???
			addEvent(window, 'resize', hide);
			addEvent(document, 'click', outsideClick);
		}

		function outsideClick(e) {
			if ( !listbox.contains(e.target) && !listbox.contains(e.target)) hide();
		}

		function onInput() {
			debounce(process(), opt.debounce);
		}

		function process() {
			const obj = getQuery();

			if (obj && obj.query.length >= opt.threshold && caretRect) {
				let array = getSuggestions(obj);

				if (typeof opt.filter === 'function' && array.length) array = opt.filter(array);

				itemLength = array.length;

				if (itemLength) {
					show(array);
					return;
				}
			}
			hide();
		}

		function getQuery() {
			caretRect = null;
			let text;

			if (isText) {
				const lastIndex = element.selectionStart;
				text = element.value.substr(0, lastIndex);
				caretRect = getCaretCoordinates(element, lastIndex);

			} else {
				text = getText();
			}

			const rm = queryRegex.exec(text);
			if (rm) {
				const match = opt.caseSensitive ? rm[0] : rm[0].toLowerCase(),
					query = opt.caseSensitive ? rm[2] : rm[2].toLowerCase();

				return { match : match, query : query, offset : rm[1].length }
			}

			const len = text.length;
			log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
			return null;
		}

		function getText() {
			const rng = getSelection().getRangeAt(0),
				range = document.createRange();

			caretRect = rng.getBoundingClientRect();

			range.selectNodeContents(element);
			range.setEnd(rng.startContainer, rng.startOffset);
			return range.toString();
		}

		function navigateList(e) {
			const key = e.key;

			if (key === 'Escape') {
				hide();
				return;
			}

			if (key === 'ArrowUp') {
				e.preventDefault(e);
				previous();

			} else if (key === 'ArrowDown') {
				e.preventDefault(e);
				next();

			} else if (key === 'Enter' || key === 'Tab') {
				const selected = document.querySelector(`ul.${opt.listClass} > li.selected`);
				if (selected) {
					e.preventDefault(e);
					selected.click();
				}
			}
		}

		function next() {
			selectedIndex = selectedIndex >= itemLength - 1 ? 0 : selectedIndex + 1;
			update();
		}

		function previous() {
			selectedIndex = selectedIndex <= 0 ? itemLength - 1 : selectedIndex - 1;
			update();
		}

		function update() {
			const items = document.querySelectorAll(`ul.${opt.listClass} > li.${opt.listItemClass}`);

			items.forEach((item, index) => {
				item.classList.toggle('selected', index === selectedIndex);
			});

			// Ensure the selected item is visible in the listbox
			const selectedItem = items[selectedIndex];
			if (selectedItem) {
				selectedItem.scrollIntoView({ block : 'nearest', behavior : 'smooth' });
			}
		}

		function show(list) {
			listbox.innerHTML = '';
			listbox.style.height = '10';    // resets scrollbar

			list.forEach((obj, i) => {
				const elem = createElement(opt.listItemTagName, opt.listItemClass);
				elem.setAttribute('data-insert', obj.insert);
				elem.textContent = obj.value;

				listbox.appendChild(elem);
			});
			listbox.style.display = 'block';    // must be set before calling 'getListPlacement()'

			const rect = getListPlacement();
			listbox.style.top = rect.top + 'px';
			listbox.style.left = rect.left + 'px';
			listbox.style.height = 'auto';
			selectedIndex = 0;
		}

		function hide() {
			listbox.style.display = 'none';
		}

		function optimize(suggestions) {
			const obj = {};

			suggestions.forEach((str) => {
				let key = getKey(str),
					array = obj[key];

				if (array) array.push(str);
				else obj[key] = [str];
			});
			return obj;
		}

		function getKey(str) {
			let key = '';
			for (let i = 0; i < opt.threshold; i++) {
				key += str.charAt(i);
			}
			return opt.caseSensitive ? key : key.toLowerCase();
		}

		function getSuggestions(obj) {
			const whole = opt.wholeMatch,
				queryLen = obj.query.length,
				matchLen = obj.match.length,
				suggestions = Array.isArray(opt.suggestions) ? opt.suggestions : opt.suggestions[getKey(obj.query)];

			let array = [],
				count = 0,
				index, item, str;

			if ( !suggestions) {
				log(libName + ': Suggestion array is undefined for ', obj.query);
				return array;
			}

			for (let i = 0; i < suggestions.length; i++) {
				item = suggestions[i];
				str = opt.caseSensitive ? item : item.toLowerCase();
				index = str.indexOf(obj.query);

				if (index === 0 && str.length > queryLen || whole && str.length > matchLen && str.indexOf(obj.match) === 0) {
					const cutIndex = obj.match.length - (index === 0 ? obj.offset : 0);
					array.push({ value : item, insert : item.substr(cutIndex) });

					if (++count >= opt.maxResults) break;
				}
			}

			log(libName + ': Suggestion count = ', array.length);
			return array;
		}

		function getListPlacement() {
			const rect = listbox.getBoundingClientRect(),
				listX = opt.listOffsetX,
				listY = opt.listOffsetY,
				offsetY = window.pageYOffset,
				offsetX = window.pageXOffset,
				right = offsetX + window.innerWidth - 20,
				bottom = offsetY + window.innerHeight - 20;

			let top = caretRect.top + caretRect.height + offsetY,
				left = caretRect.left + offsetX;

			if (left + rect.width > right) {
				left = left - rect.width - listX;

			} else left += listX;

			if (top + rect.height > bottom) {
				top = top - rect.height - caretRect.height - listY;

			} else top += listY;

			return { top : top, left : left };
		}

		function getCaretCoordinates(elem, lastIndex) {
			const rect = elem.getBoundingClientRect(),
				text = elem.value,
				content = text.substring(0, lastIndex),
				style = window.getComputedStyle(elem),
				div = document.createElement('div'),
				span = document.createElement('span');

			div.textContent = isInput ? content.replace(/\s/g, '\u00a0') : content;
			span.textContent = text.charAt(lastIndex) || '.';
			div.appendChild(span);
			document.body.appendChild(div);

			const properties = [
				'direction', 'boxSizing',
				'textAlign', 'textTransform', 'textIndent',
				'letterSpacing', 'wordSpacing',
				'overflowX', 'overflowY',
				'tabSize'
			];

			properties.forEach(prop => {
				div.style[prop] = style.getPropertyValue(prop);
			});

			const props = {
				width : style.width,
				wordWrap : "break-word",
				whiteSpace : "pre-wrap",
			};

			Object.assign(div.style, {
				position : "absolute",
				visibility : "hidden",
				top : rect.top + "px",
				left : rect.left + "px",
				height : style.height,

				font : style.font,
				padding : style.padding,
				border : style.border,
			}, ( !isInput ? props : {}));

			const height = span.getBoundingClientRect().height,
				offsetY = isInput ? (elem.clientHeight - height) / 2 : 0,
				top = rect.top + span.offsetTop - (elem.scrollHeight > elem.clientHeight ? elem.scrollTop : 0) + parseInt(style.borderTopWidth) + offsetY,
				left = rect.left + span.offsetLeft - (elem.scrollWidth > elem.clientWidth ? elem.scrollLeft : 0) + parseInt(style.borderLeftWidth);

			document.body.removeChild(div);

			return { top, left, height };
		}

		function insert(text) {
			if (isText) {
				const value = element.value,
					index = element.selectionStart;

				element.value = value.substr(0, index) + text + value.substr(index);

			} else {
				text = text.replace(/[<>&"']/g, m => {
					return m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '&' ? '&amp;' : m === '"' ? '&quot;' : '&#039;';
				});
				document.execCommand('insertHTML', false, text);
			}
			hide();
		}

		function getSelection() {
			try { return DocumentOrShadowRoot.getSelection(); } catch (e) { }
			return window.getSelection();
		}

		function debounce(callback, duration) {
			let id;
			return function() {
					clearTimeout(id);
					id = setTimeout(function() { callback(); }, duration);
				};
		}

		function log(msg) {
			if (opt.debug) {
				console.log([...arguments].join(' '));
			}
		}

		function removeElementEvents() {
			if (element) {
				remove(element, 'input', onInput);
				remove(element, 'blur', hide);
				remove(element, 'keydown', navigateList);
			}
		}

		function removeEvents() {
			remove(document, 'click', outsideClick);
			remove(window, 'resize', hide);

			if (listbox) document.body.removeChild(listbox);
		}

		function addEvent(elem, type, fn) {
			elem.addEventListener(type, fn);
		}

		function remove(elem, type, fn) {
			elem.removeEventListener(type, fn);
		}
	}

	function distinct(array) {
		const result = [];
		array.forEach(item => {
			if ( !result.includes(item)) result.push(item);
		});
		return result;
	}

	const regExpCreator = {
		create : function(opt, libName) {
			const queryChars = this.preprocess(opt.queryChars),
				quantifier = opt.threshold === 0 ? '*' : '+',
				queryPattern = `([${queryChars}]${quantifier})`;

			let triggerPattern;

			if (Array.isArray(opt.triggerChars)) {
				let pattern = opt.triggerChars.map((str, i) => i === 0 && str === '^' ? str : this.escapeChars(str)).join('|');
				triggerPattern = '(' + pattern + ')';

			} else {
				const chars = this.preprocess(opt.triggerChars);
				triggerPattern = '(^|[' + chars + '])';
			}

			if (opt.debug) {
				console.log(libName + ": RegExp trigger pattern - " + triggerPattern, ' query pattern - ' + queryPattern);
			}
			return new RegExp(`${triggerPattern}${queryPattern}$`, 'u');
		},

		escapeChars : function(value) {
			if (value && value.length) {
				const array = this.split(value);
				return array.map(str => str.length > 4 || /\\[wdsWDSnt]/.test(str) ? str : this.escape(str)).join('');
			}
			return '';
		},

		preprocess : function(value) {
			if (value && value.length) {
				let array = this.split(value);
				array = distinct(array);
				return array.map(str => str.length > 4 || /\\[wdsWDSnt]/.test(str) ? str : this.escapeCharSet(str)).join('');
			}
			return '';
		},

		escapeCharSet : function(str) {
			return str.replace(/[-^\]\\]/g, '\\$&');
		},

		escape : function(str) {
			return str.replace(/[[\]/{}()*+?.\\^$|]/g, '\\$&');
		},

		split : function(str) {
			return str.split(/(\\[pPu]\{[^}]+\}|\\[wdsWDSnt]|.)/);
		}
	};

	return autoComplete;
});























