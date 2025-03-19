
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

		const name = 'auto-complete',
			libName = 'auto-complete.js';

		let element,
			queryRegex,
			regexSource,
			listbox,
			listSelector,
			isContentEditable,
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
			listTag : 'ul',
			listItemTag : 'li',
			listClass : name + '-list',
			listItemClass : name + '-item',
			listOffsetX : 5,
			listOffsetY : 5,
			caseSensitive : false,
			wholeMatch : true,
			debounce : 1,
			threshold : 1,
			maxResults : 100,
			//filter : () => {},
			debug : false,
		}, this.options);
		
		listSelector = `${opt.listTag}.${opt.listClass}`;
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

			isContentEditable = !((isInput = elem instanceof HTMLInputElement) || elem instanceof HTMLTextAreaElement);

			addEvent(elem, 'input', onInput);
			addEvent(elem, 'blur', hide);
			addEvent(elem, 'keydown', navigateList);
			return elem;
		}

		function createListbox() {
			listbox = createElement(opt.listTag, opt.listClass);
			document.body.appendChild(listbox);
			addEvent(listbox, 'mousedown', (e) => e.preventDefault());
			addEvent(listbox, 'click', listItemClick);
		}

		function listItemClick(e) {
			replaceQuery(e.target.closest(opt.listItemTag));
		}

		function createElement(name, klass) {
			let elem = document.createElement(name);
			if (klass) elem.setAttribute('class', klass);
			return elem;
		}

		function registerEvents() {
			addEvent(window, 'load', hideLists());    // FireFox displays all lists on load
			addEvent(window, 'resize', hide);
			addEvent(document, 'click', outsideClick);
		}

		function hideLists() {
			setTimeout(function() {
				document.querySelectorAll(listSelector).forEach(elem => { elem.style.display = 'none'; });
			}, 20);
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
					if ( !opt.startsWith && opt.sort) {
						// sorts by the priority of query substring is more closer to the beginning of suggestion string
						array.sort((a, b) => a.startIndex - b.startIndex);
					}
					show(array);
					return;
				}
			}
			hide();
		}

		function getQuery() {
			caretRect = null;
			let text = '';

			if (isContentEditable) {
				text = getText();

			} else {
				const lastIndex = element.selectionStart;
				text = element.value.substr(0, lastIndex);
				caretRect = getCaretCoordinates(element, lastIndex);
			}

			const rm = queryRegex.exec(text);
			if (rm) {
				return { match : rm[0], query : rm[2], offset : rm[1].length }
			}

			const len = text.length;
			log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
			return null;
		}

		// taken from 'codejar.js' and adapted for this library
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
				const selected = document.querySelector(`${listSelector} > ${opt.listItemTag}.selected`);
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
			const items = document.querySelectorAll(`${listSelector} > ${opt.listItemTag}`);

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
				const text = obj.text,
					start = obj.startIndex,
					end = start + obj.query.length,
					elem = createElement(opt.listItemTag, opt.listItemClass);

				elem.setAttribute('data-query', obj.query);
				elem.setAttribute('data-text', text);

				if (opt.highlight) {
					if (start > 0) {
						elem.textContent = text.substr(0, start);
					}

					const mark = createElement('mark');
					mark.textContent = text.substring(start, end);
					elem.appendChild(mark);

					if (end < text.length) {
						elem.appendChild(document.createTextNode(text.substr(end)));
					}

				} else {
					elem.textContent = text;
				}

				listbox.appendChild(elem);
			});
			listbox.style.display = 'block';    // must be set before calling 'getListPlacement()'

			const rect = getListPlacement();
			listbox.style.top = rect.top + 'px';
			listbox.style.left = rect.left + 'px';
			listbox.scrollTop = 0;
			selectedIndex = -1;
		}

		function hide() {
			if ( !listbox) return; 
			listbox.innerHTML = '';
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
			let match = obj.match,
				query = obj.query;
			match = opt.caseSensitive ? match : match.toLowerCase(),
				query = opt.caseSensitive ? query : query.toLowerCase();

			const queryLen = query.length,
				matchLen = match.length,
				startsWith = opt.startsWith,
				suggestions = opt.suggestions,
				array = Array.isArray(suggestions) ? suggestions : suggestions[getKey(query)];

			let results = [],
				count = 0,
				text, str, index, success;

			if ( !array) {
				log(libName + ': Suggestion array is undefined for ', obj.query);
				return results;
			}

			for (let i = 0; i < array.length; i++) {
				text = array[i];
				str = opt.caseSensitive ? text : text.toLowerCase();
				index = str.indexOf(query);
				
				if (startsWith) {
					success = index === 0 && str.length > queryLen;

				} else {
					success = index > 0 || index === 0 && str.length > queryLen;
				}

				if (success) {
					results.push({ text : text, value : str, query : query, startIndex : index });

					if (++count >= opt.maxResults) break;
				}
			}

			log(libName + ': Suggestion count = ', results.length);
			return results;
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

		// from https://github.com/component/textarea-caret-position; undergoes refactoring, bugs fixing and adaptation
		function getCaretCoordinates(elem, lastIndex) {
			const rect = elem.getBoundingClientRect(),
				text = elem.value,
				len = text.length,
				content = text.substring(0, lastIndex),
				style = window.getComputedStyle(elem),
				div = document.createElement('div'),
				span = document.createElement('span');

			div.textContent = isInput ? content.replace(/\s/g, '\u00a0') : content;
			span.textContent = text.substr(lastIndex, len - lastIndex > 50 ? 50 : len) || '.';
			div.appendChild(span);
			document.body.appendChild(div);

			const properties = [
				'direction', 'boxSizing',
				'textAlign', 'textAlignLast', 'textTransform', 'textIndent',
				'letterSpacing', 'wordSpacing', 'wordBreak',
				'overflowX', 'overflowY',
				'tabSize'
			];

			properties.forEach(prop => {
				div.style[prop] = style.getPropertyValue(prop);
			});

			const props = {
				width : style.width,
				wordWrap : "normal",
				whiteSpace : "pre-wrap",
			};

			Object.assign(div.style, {
				position : "absolute",
				visibility : "hidden",
				top : rect.top + "px",
				left : rect.left + "px",
				//height : style.height,
				font : style.font,
				padding : style.padding,
				border : style.border,
			}, ( !isInput ? props : {}));

			const height = span.getBoundingClientRect().height,
				offsetY = isInput ? (elem.clientHeight - height) / 2 : 0,
				top = rect.top + span.offsetTop - (elem.scrollHeight > elem.clientHeight ? elem.scrollTop : 0) + parseInt(style.borderTopWidth) + offsetY,
				left = rect.left + span.offsetLeft - (elem.scrollWidth > elem.clientWidth ? elem.scrollLeft : 0) + parseInt(style.borderLeftWidth) - 1;

			document.body.removeChild(div);

			return { top, left, height };
		}

		function replaceQuery(elem) {
			const query = elem.getAttribute('data-query'),
				suggestion = elem.getAttribute('data-text');

			if ( !query) return;

			if (isContentEditable) {
				const len = getText().length;

				select(element, len - query.length, len);

				const text = suggestion.replace(/[<>&"']/g, m => {
					return m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '&' ? '&amp;' : m === '"' ? '&quot;' : '&#039;';
				});
				document.execCommand('insertHTML', false, text);

			} else {
				const value = element.value,
					index = element.selectionStart,
					queryIndex = index - query.length;

				element.value = value.substr(0, queryIndex) + suggestion + value.substr(index);
				element.selectionStart = element.selectionEnd = queryIndex + suggestion.length; // set cursor at the end of suggestion
			}
			hide();
		}

		// taken from 'codejar.js' and adapted for this library
		function select(element, start, end) {
			const selection = getSelection(),
				stack = [];
			let startNode,
				endNode,
				startOffset = 0,
				endOffset = 0,
				current = 0,
				elem = element.firstChild;

			while (elem) {
				if (elem.nodeType === Node.TEXT_NODE) {
					const len = (elem.nodeValue || '').length;
					
					if (current + len >= start && start >= current) {
						if ( !startNode) {
							startNode = elem;
							startOffset = start - current;
						}
						if (current + len >= end && end >= current) {
							endNode = elem;
							endOffset = end - current;
							break;
						}
					}
					current += len;
				}

				if (elem.nextSibling) stack.push(elem.nextSibling);
				if (elem.firstChild) stack.push(elem.firstChild);
				elem = stack.pop();
			}
			if ( !startNode) {
				startNode = element;
				startOffset = element.childNodes.length;
			}
			if ( !endNode) {
				endNode = element;
				endOffset = element.childNodes.length;
			}
			selection.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
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























