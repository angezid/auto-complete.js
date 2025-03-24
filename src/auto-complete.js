
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

		let context,
			queryRegex,
			regexSource,
			caretCoords,
			listbox,
			listSelector,
			isContentEditable,
			isInput,
			itemsLength = 0,
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

		context = registerElement(this.ctx);
		createListbox();
		registerEvents();
		
		if (opt.optimize && opt.startsWith) {
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
			listbox = createElement(document.body, opt.listTag, opt.listClass);
			addEvent(listbox, 'mousedown', (e) => e.preventDefault());
			addEvent(listbox, 'click', listItemClick);
		}

		function listItemClick(e) {
			replaceQuery(e.target.closest(opt.listItemTag));
		}

		function createElement(parent, name, klass, content) {
			let elem = document.createElement(name);

			if (klass) elem.setAttribute('class', klass);
			if (content) elem.textContent = content;

			parent.appendChild(elem);
			return elem;
		}

		function registerEvents() {
			addEvent(window, 'load', hideLists);    // FireFox displays all lists on load
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
			caretCoords = null;
			const obj = getQuery();

			if (obj && obj.query.length >= opt.threshold && caretCoords) {
				let array = getSuggestions(obj);

				if (typeof opt.filter === 'function' && array.length) {
					array = opt.filter(array) || array; // in case of modification of existing array
				}

				itemsLength = array.length;

				if (itemsLength) {
					if ( !opt.startsWith && opt.sort) {
						// sorts by the priority of query substring is more closer to the beginning of suggestion string
						array.sort((a, b) => a.startIndex - b.startIndex);

						const index = array.findIndex(a => a.startIndex === 0 && a.query === a.value);
						if (index > 0) {
							const temp = array[0];
							array[0] = array[index];
							array[index] = temp;
						}
					}
					show(array);
					return;
				}
			}
			hide();
		}

		function getQuery() {
			let text = '';

			if (isContentEditable) {
				text = contentEditable.getText(context);
				caretCoords = contentEditable.caretCoordinates;

			} else {
				text = textarea.getText(context);
				caretCoords = textarea.caretCoordinates;
			}

			const rm = queryRegex.exec(text);
			if (rm) {
				return { match : rm[0], query : rm[2], offset : rm[1].length }
			}

			const len = text.length;
			log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
			return null;
		}

		function show(list) {
			listbox.innerHTML = '';
			const array = [],
				custom = typeof opt.listItem === 'function';
			let highlight = opt.highlight;

			list.forEach((data, i) => {
				let text = data.text;
				const elem = createElement(listbox, opt.listItemTag, opt.listItemClass, text);
				elem.setAttribute('data-query', data.query);
				elem.setAttribute('data-text', text);

				if (highlight) {
					const start = data.startIndex,
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
			});

			// must be set before calling 'getListPlacement()'
			listbox.style.display = 'block';

			const rect = getListPlacement();
			listbox.style.top = rect.top + 'px';
			listbox.style.left = rect.left + 'px';
			listbox.scrollTop = 0;
			selectedIndex = -1;
		}

		function hide() {
			listbox.innerHTML = '';
			listbox.style.display = 'none';
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
			selectedIndex = selectedIndex >= itemsLength - 1 ? 0 : selectedIndex + 1;
			update();
		}

		function previous() {
			selectedIndex = selectedIndex <= 0 ? itemsLength - 1 : selectedIndex - 1;
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
			let key = '',
				num = Math.min(opt.threshold, 2);
			for (let i = 0; i < num; i++) {
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
				text, str, index;

			if ( !array) {
				log(libName + ': Suggestion array is undefined for ', obj.query);
				return results;
			}

			for (let i = 0; i < array.length; i++) {
				text = array[i];
				str = opt.caseSensitive ? text : text.toLowerCase();
				index = str.indexOf(query);

				if (startsWith ? index === 0 : index >= 0) {
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

			let top = caretCoords.top + caretCoords.height + offsetY,
				left = caretCoords.left + offsetX;

			if (top + rect.height > bottom) {
				top = top - rect.height - caretCoords.height - listY;

			} else top += listY;

			if (left + rect.width > right) {
				left = left - rect.width - listX;

			} else left += listX;

			return { top : top, left : left };
		}

		function replaceQuery(elem) {
			const query = elem.getAttribute('data-query'),
				suggestion = elem.getAttribute('data-text');

			if ( !query) return;

			if (isContentEditable) {
				contentEditable.replace(context, query, suggestion);

			} else {
				textarea.replace(context, query, suggestion);
			}
			hide();
		}

		const contentEditable = {
			caretCoordinates : null,

			// taken from 'codejar.js' and adapted for this library
			getText: function(elem) {
				const rng = getSelection().getRangeAt(0),
					range = document.createRange();

				this.caretCoordinates = rng.getBoundingClientRect();

				range.selectNodeContents(elem);
				range.setEnd(rng.startContainer, rng.startOffset);
				return range.toString();
			},

			replace: function(elem, query, suggestion) {
				const len = this.getText(elem).length;

				this.select(elem, len - query.length, len);

				const text = suggestion.replace(/[<>&"']/g, m => {
					return m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '&' ? '&amp;' : m === '"' ? '&quot;' : '&#039;';
				});
				document.execCommand('insertHTML', false, text);
			},

			select : function(elem, start, end) {
				const selection = getSelection();
				let startNode,
					endNode,
					startOffset = 0,
					endOffset = 0,
					previous = 0,
					node;

				const iterator = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT, () => NodeFilter.FILTER_ACCEPT);
				while (node = iterator.nextNode()) {
					if (node.nodeValue) {
						const current = previous + node.nodeValue.length;

						if ( !startNode && current > start) {
							startNode = node;
							startOffset = start - previous;
						}

						if ( !endNode && current >= end) {
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
			}
		};

		const textarea = {
			caretCoordinates : null,

			getText : function(elem) {
				const lastIndex = elem.selectionStart,
					text = elem.value.substr(0, lastIndex);
				this.caretCoordinates = this.getCaretCoordinates(elem, lastIndex);
				return text;
			},

			replace: function(elem, query, suggestion) {
				const value = elem.value,
					index = elem.selectionStart,
					queryIndex = index - query.length;

				elem.value = value.substr(0, queryIndex) + suggestion + value.substr(index);
				// set cursor at the end of suggestion
				elem.selectionStart = elem.selectionEnd = queryIndex + suggestion.length;
			},

			// from https://github.com/component/textarea-caret-position; undergoes refactoring, bugs fixing and adaptation
			getCaretCoordinates: function(elem, lastIndex) {
				const rect = elem.getBoundingClientRect(),
					text = elem.value,
					len = text.length,
					content = text.substring(0, lastIndex),
					style = window.getComputedStyle(elem),

					div = createElement(document.body, 'div', null, isInput ? content.replace(/\s/g, '\u00a0') : content),
					span = createElement(div, 'span', null, text.substr(lastIndex, len - lastIndex > 50 ? 50 : len) || '.');

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
		};

		function getSelection() {
			return context.getRootNode().getSelection();
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
			if (context) {
				remove(context, 'input', onInput);
				remove(context, 'blur', hide);
				remove(context, 'keydown', navigateList);
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
				array = this.distinct(array);
				return array.map(str => str.length > 4 || /\\[wdsWDSnt]/.test(str) ? str : this.escapeCharSet(str)).join('');
			}
			return '';
		},

		distinct : function(array) {
			const result = [];
			array.forEach(item => {
				if ( !result.includes(item)) result.push(item);
			});
			return result;
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























