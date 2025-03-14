
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

		const name = 'autocomplete',
			libName = 'auto-complete.js',
			listClass = name + '-list',
			listItemClass = name + '-item';

		let element,
			listbox,
			queryRegex,
			regexSource,
			isText,
			clientRect,
			selectionStart,
			itemLength = 0,
			selectedIndex = 0;

		const opt = Object.assign({}, {
			suggestions : [],
			queryChars : '\\d\\p{L}_-',
			//queryChars : '\\S',
			triggerChars : '\\s$+<=>^`|~\\p{P}',
			regex : null,
			caseSensitive : false,
			debounce : 0,
			threshold : 1,
			maxResults : 15,
			results : () => {},
			debug : false,
		}, this.options);

		queryRegex = (opt.regex instanceof RegExp) ? opt.regex : regExpCreator.create(opt, libName);
		log(libName +  ': query RegExp - /' + queryRegex.source + '/' + queryRegex.flags);

		element = registerElement(this.ctx);
		isText = (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement);
		createListbox();
		registerEvents();

		function registerElement(ctx) {
			//let elem = (ctx instanceof HTMLElement) ? ctx : document.querySelector(ctx || '#' + name);
			let elem = typeof ctx === 'string' ? document.querySelector(ctx || '#' + name) : ctx;

			addEvent(elem, 'input', onInput);
			addEvent(elem, 'blur', hide);
			addEvent(elem, 'keydown', navigateList);
			return elem;
		}

		function createListbox() {
			listbox = createElement('ul', listClass);
			document.body.appendChild(listbox);
			listbox.addEventListener('mousedown', (e) => e.preventDefault());
			listbox.addEventListener('click', (e) => insert(e.target.getAttribute('data-insert')));
		}

		function createElement(name, klass) {
			let elem = document.createElement(name);
			if (klass) elem.setAttribute('class', klass);
			return elem;
		}

		function registerEvents() {
			addEvent(window, 'resize', hide);
			addEvent(document, 'click', outsideClick);
		}

		function outsideClick(e) {
			if ( !listbox.contains(e.target) && !listbox.contains(e.target)) hide();
		}

		function onInput() {
			const obj = getQuery();

			if (obj && obj.query.length >= opt.threshold && clientRect) {
				let array = getSuggestions(obj);

				if (opt.filter && array.length) array = opt.filter(query, array);

				itemLength = array.length;

				if (itemLength) {
					show(array);
					return;
				}
			}
			hide();
		}

		function getQuery() {
			let text;
			if (isText) {
				text = element.value;
				selectionStart = element.selectionStart;
				text = text.substr(0, selectionStart);
				clientRect = getClientRect(element);

			} else {
				text = getText();
			}

			const rm = queryRegex.exec(text);
			if (rm) {
				const match = opt.ignoreCase ? rm[0].toLowerCase() : rm[0],
					query = opt.ignoreCase ? rm[2].toLowerCase() : rm[2];

				return { match : match, query : query, offset : rm[1].length }
			}

			const len = text.length;
			log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
			return null;
		}

		function getText() {
			const rng = getSelection().getRangeAt(0),
				range = document.createRange();

			clientRect = rng.getBoundingClientRect();

			range.selectNodeContents(element);
			range.setEnd(rng.startContainer, rng.startOffset);
			return range.toString();
		}

		function navigateList(e) {
			if (listbox.style.display === 'none') return;

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

			} else if (key === 'Enter') {
				const selected = document.querySelector(`ul.${listClass} > li.selected`);
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
			const items = document.querySelectorAll(`ul.${listClass} > li.${listItemClass}`);

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

			list.forEach((obj, i) => {
				const li = createElement('li', 'autocomplete-item');
				li.setAttribute('data-insert', obj.insert);
				li.textContent = obj.listItem;

				listbox.appendChild(li);
				listbox.style.display = 'block';
			});

			const rect = getPlacement();
			listbox.style.top = rect.top + 'px';
			listbox.style.left = rect.left + 'px';
			selectedIndex = 0;
		}

		function hide() {
			listbox.style.display = 'none';
		}

		function getSuggestions(obj) {
			const length = opt.suggestions.length,
				queryLen = obj.query.length,
				matchLen = obj.match.length;

			let array = [],
				count = 0,
				index, item, str;

			for (let i = 0; i < length; i++) {
				item = opt.suggestions[i];
				str = opt.ignoreCase ? item.toLowerCase() : item;
				index = str.indexOf(obj.query);

				if (index === 0 && str.length > queryLen || str.length > matchLen && str.indexOf(obj.match) === 0) {
					const cutIndex = obj.match.length - (index === 0 ? obj.offset : 0);
					array.push({ listItem : item, insert : item.substr(cutIndex) });

					if (++count > opt.maxResults) break;
				}
			}
			log(libName + ': Suggestion count = ',  array.length);
			return array;
		}

		function getPlacement() {
			const style = window.getComputedStyle(listbox),
				width = parseInt(style.getPropertyValue('width')),
				height = parseInt(style.getPropertyValue('height')),

				offsetTop = window.pageYOffset,
				offsetLeft = window.pageXOffset,

				bottom = offsetTop + window.innerHeight - 20,
				right = offsetLeft + window.innerWidth - 20;

			let top = clientRect.bottom + offsetTop,
				left = clientRect.left + offsetLeft;

			if (left + width > right) {
				left = left - (left + width + 20 - right);
			}

			if (top + height > bottom) {
				top = top - height - (clientRect.height + 10);
			}

			return { top : top + 5, left : left + 5 };
		}

		function getClientRect(elem) {
			const rect = elem.getBoundingClientRect(),
				style = window.getComputedStyle(elem),
				div = document.createElement('div');
			document.body.appendChild(div);

			const properties = [
				'letterSpacing',
				'textAlign',
				'textTransform',
			];

			properties.forEach(prop => {
				div.style[prop] = style.getPropertyValue(prop);
			});

			Object.assign(div.style, {
				position : "absolute",
				visibility : "hidden",
				wordWrap : "break-word",
				whiteSpace : "pre-wrap",
				top : rect.top + "px",
				left : rect.left + "px",
				width : rect.width + "px",
				height : rect.height + "px",
				font : style.font,
				padding : style.padding,
				border : style.border,
				lineHeight : style.lineHeight,
			});

			const text = elem.value;
			div.textContent = text.substring(0, selectionStart);

			const span = document.createElement('span');
			span.textContent = text.charAt(selectionStart) || '.';
			div.appendChild(span);

			const spanRect = span.getBoundingClientRect(),
				isScrolledY = elem.scrollHeight > rect.height,
				isScrolledX = elem.scrollLeft > rect.width,
				height = spanRect.height,
				top = rect.top + span.offsetTop - (isScrolledY ? elem.scrollTop : 0),
				left = rect.left  + span.offsetLeft - (isScrolledX ? elem.scrollLeft : 0),
				bottom = top + height;

			//console.log(isScrolledY, 'elem.scrollTop=', elem.scrollTop, 'rect.top=', rect.top, 'spanRect.top=', spanRect.top, 'span.offsetTop=', span.offsetTop, 'div.scrollHeight=', div.scrollHeight );

			return { top, left, bottom, height };
		}

		function insert(text) {
			if (isText) {
				const value = element.value,
					index = element.selectionStart;

				element.value = value.substr(0, index) + text + value.substr(index);
				//element.value = value.substr(0, selectionStart) + text + value.substr(selectionStart);

			} else {
				text = text.replace(/[<>&"']/g, m => {
					return m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '&' ? '&amp;' : m === '"' ? '&quot;' : '&#039;';
				});
				document.execCommand('insertHTML', false, text);
			}
			hide();
		}

		function getSelection() {
			const root = element.getRootNode();
			if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				try { return root.getSelection(); } catch (e) { }
			}
			return window.getSelection();
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























