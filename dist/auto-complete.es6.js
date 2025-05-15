/*!*******************************************
* auto-complete.js 1.0.0
* https://github.com/angezid/auto-complete.js
* MIT licensed
* Copyright (c) 2025, angezid
*********************************************/
const regExpCreator = {
	create : function(opt, libName) {
		const queryChars = this.preprocess(opt.queryChars),
			queryPattern = `([${queryChars}]+)`;
		const chars = this.preprocess(opt.triggerChars),
			triggerPattern = '(^|[' + chars + ']+)';
		if (opt.debug) {
			console.log(libName + ': RegExp trigger pattern - ' + triggerPattern, ' query pattern - ' + queryPattern);
		}
		return new RegExp(`${triggerPattern}${queryPattern}$`, 'u');
	},
	preprocess : function(value) {
		if (value && value.length) {
			const array = value.split(/(\\[pPu]\{[^}]+\}|\\[swdSWDnt]|.)/).filter(s => s.length);
			return array.map((str, i) => this.noEscape(str, i) ? str : this.escapeCharSet(str)).join('');
		}
		return '';
	},
	noEscape : function(str, i) {
		return i === 0 && str === '^' || str.length > 4 || /\\[swdSWDnt]/.test(str);
	},
	escapeCharSet : function(str) {
		return str.replace(/[-^\]\\]/g, '\\$&');
	}
};

const contentEditable = {
	caretCoordinates: null,
	getText: function(elem, textContent) {
		const sel = this.getSelection(elem);
		let text = '',
			rng;
		if ( !sel.rangeCount || (rng = sel.getRangeAt(0)).startContainer === elem) {
			this.caretCoordinates = elem.getBoundingClientRect();
			return elem.textContent;
		}
		const startNode = rng.startContainer,
			startOffset = rng.startOffset;
		if (textContent || elem.contentEditable === 'plaintext-only' && !this.isFirefox()) {
			const range = document.createRange();
			range.selectNodeContents(elem);
			range.setEnd(startNode, startOffset);
			text = range.toString();
			if (textContent) return text;
		} else {
			const anchorNode = sel.anchorNode,
				anchorOffset = sel.anchorOffset,
				focusNode = sel.focusNode,
				focusOffset = sel.focusOffset;
			sel.setBaseAndExtent(elem, 0, startNode, startOffset);
			text = sel.toString();
			sel.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
		}
		let rect = rng.getBoundingClientRect();
		if (rect.x === 0 && rect.y === 0) {
			rect = startNode.getBoundingClientRect();
		}
		this.caretCoordinates = rect;
		return text;
	},
	replace: function(elem, query, text) {
		const len = this.getText(elem, true).length;
		const asHtml = elem.contentEditable === 'true' || !this.isFirefox();
		if (asHtml) {
			const obj = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', '\'': '&#039;' };
			text = text.replace(/[<>&"']/g, m => obj[m]);
		}
		this.select(elem, len - query.length, len);
		document.execCommand(asHtml ? 'insertHTML' : 'insertText', false, text);
	},
	select: function(elem, start, end) {
		let startNode,
			endNode,
			startOffset = 0,
			endOffset = 0,
			previous = 0,
			node;
		const iterator = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT);
		while ((node = iterator.nextNode())) {
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
		if (startNode && endNode) {
			this.getSelection(elem).setBaseAndExtent(startNode, startOffset, endNode, endOffset);
		}
	},
	getSelection: function(elem) {
		return elem.getRootNode().getSelection();
	},
	isFirefox : function() {
		return /firefox/i.test(navigator.userAgent);
	}
};

function createElement(parent, tag, attributes, content) {
	let elem = document.createElement(tag);
	if (attributes) {
		for (const name in attributes) {
			elem.setAttribute(name, attributes[name]);
		}
	}
	if (content) elem.textContent = content;
	parent.appendChild(elem);
	return elem;
}

const textarea = {
	caretCoordinates: null,
	getText: function(elem) {
		const caretIndex = elem.selectionStart,
			text = elem.value.substr(0, caretIndex);
		this.caretCoordinates = this.getCaretCoordinates(elem, caretIndex);
		return text;
	},
	replace: function(elem, query, text) {
		const value = elem.value,
			index = elem.selectionStart,
			queryIndex = index - query.length;
		elem.value = value.substr(0, queryIndex) + text + value.substr(index);
		elem.selectionStart = elem.selectionEnd = queryIndex + text.length;
	},
	getCaretCoordinates: function(elem, caretIndex) {
		const rect = elem.getBoundingClientRect(),
			isInput = elem instanceof HTMLInputElement,
			text = elem.value,
			content = text.substring(0, caretIndex),
			style = window.getComputedStyle(elem),
			div = createElement(document.body, 'div', null, isInput ? content.replace(/\s/g, '\u00a0') : content),
			span = createElement(div, 'span', null, text.substring(caretIndex) || '.');
		const properties = [
			'direction', 'boxSizing',
			'textAlign', 'textAlignLast', 'textTransform', 'textIndent',
			'letterSpacing', 'wordSpacing', 'wordBreak',
			'overflowX', 'overflowY',
			'tabSize'
		];
		properties.forEach(prop => {
			div.style[prop] = style[prop];
		});
		const props = {
			width: style.width,
			height: style.height,
			wordWrap: 'normal',
			whiteSpace: 'pre-wrap',
		};
		Object.assign(div.style, {
			position: 'absolute',
			visibility: 'hidden',
			top: rect.top + 'px',
			left: rect.left + 'px',
			font: style.font,
			padding: style.padding,
			border: style.border,
		}, ( !isInput ? props : {}));
		const fontSize = parseInt(style.fontSize),
			height = fontSize + fontSize / 2,
			top = rect.top + span.offsetTop - (elem.scrollHeight > elem.clientHeight ? elem.scrollTop : 0) + parseInt(style.borderTopWidth),
			left = rect.left + span.offsetLeft - (elem.scrollWidth > elem.clientWidth ? elem.scrollLeft : 0) + parseInt(style.borderLeftWidth) - 1;
		document.body.removeChild(div);
		return { top, left, height };
	}
};

const diacritics = {
	chars: ['aàáảãạăằắẳẵặâầấẩẫậäåāą', 'cçćč', 'dđď', 'eèéẻẽẹêềếểễệëěēę', 'iìíỉĩịîïī', 'lł', 'nñňń',
		'oòóỏõọôồốổỗộơởỡớờợöøōő', 'rř', 'sšśșş', 'tťțţ', 'uùúủũụưừứửữựûüůūű', 'yýỳỷỹỵÿ', 'zžżź'],
	obj: {},
	init: function() {
		this.chars.forEach(str => {
			const low = str[0],
				upper = str[0].toUpperCase();
			for (let i = 1; i < str.length; i++) {
				this.obj[str[i]] = low;
				this.obj[str[i].toUpperCase()] = upper;
			}
		});
	},
	replace: function(str) {
		for (let i = 0; i < str.length; i++) {
			if (this.obj[str[i]]) {
				return str.split('').map(ch => this.obj[ch] || ch).join('');
			}
		}
		return str;
	}
};

function autoComplete(ctx, options) {
	this.newElement = function(newCtx) {
		removeElementEvents();
		registerElement(newCtx);
	};
	this.destroy = function() {
		removeElementEvents();
		removeEvents();
	};
	this.createIndexes = function(array) {
		return createIndexes(array);
	};
	const name = 'auto-complete',
		libName = 'auto-complete.js';
	let context,
		queryRegex,
		caretCoords,
		listbox,
		listSelector,
		isContentEditable,
		isReplaced,
		itemsLength = 0,
		selectedIndex = 0;
	const opt = Object.assign({}, {
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
		debug: false,
	}, options);
	const processDebounce = debounce(process, opt.debounce);
	registerElement(ctx);
	if (context) {
		createListbox();
		registerEvents();
		diacritics.init();
		listSelector = `${opt.listTag}.${opt.listClass}`;
		queryRegex = (opt.regex instanceof RegExp) ? opt.regex : regExpCreator.create(opt, libName);
		log('RegExp - /' + queryRegex.source + '/' + queryRegex.flags);
		if (opt.optimize && opt.startsWith) {
			createIndexes(opt.suggestions)
				.then(obj => { opt.suggestions = obj; })
				.catch (err => { log('' + err); });
		}
	}
	function registerElement(ctx) {
		const elem = typeof ctx === 'string' ? document.querySelector(ctx) : ctx;
		if (elem) {
			isContentEditable = !(elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement);
			addEvent(elem, 'input', onInput);
			addEvent(elem, 'blur', hide);
			addEvent(elem, 'keydown', navigate);
			context = elem;
		}
	}
	function createListbox() {
		listbox = createElement(document.body, opt.listTag, { 'class': opt.listClass });
		addEvent(listbox, 'mousedown', (e) => e.preventDefault());
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
		setTimeout(() => {
			document.querySelectorAll(listSelector).forEach(elem => { elem.style.display = 'none'; });
		}, 20);
	}
	function outsideClick(e) {
		if ( !listbox.contains(e.target)) hide();
	}
	function onInput(e) {
		if ( !isReplaced && /^(?:insertText|deleteContent($|B))/.test(e.inputType)) {
			processDebounce();
		} else {
			isReplaced = false;
			hide();
		}
	}
	function process() {
		caretCoords = null;
		const obj = getQuery();
		if (obj && obj.query.length >= opt.threshold && caretCoords) {
			let array = getSuggestions(obj);
			if (isFunction(opt.filter) && array.length) {
				array = opt.filter(array) || array;
			}
			itemsLength = array.length;
			if (itemsLength) {
				if ( !opt.startsWith && opt.sort) {
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
		array.sort((a, b) => a.startIndex - b.startIndex);
		const index = array.findIndex(obj => obj.startIndex === 0 && query === getValue(obj.value, true));
		if (index > 0) {
			const temp = array[0];
			array[0] = array[index];
			array[index] = temp;
		}
	}
	function getQuery() {
		const obj = isContentEditable ? contentEditable : textarea,
			text = obj.getText(context);
		caretCoords = obj.caretCoordinates;
		const rm = queryRegex.exec(text);
		if (rm) {
			const groups = rm.groups;
			let trigger, query;
			if (groups && (query = groups.query)) {
				trigger = groups.trigger;
			} else if ((query = rm[2])) {
				trigger = rm[1];
			}
			log(`trigger = '${trigger}' query = '${query}'`);
			return { trigger, query };
		}
		const len = text.length;
		log('No match. ', (len > 20 ? ' ... ' + text.slice(len - 20) : text).replace(/\r?\n|\r/g, ' '));
		return null;
	}
	function show(list) {
		const custom = isFunction(opt.listItem);
		listbox.innerHTML = '';
		list.forEach((data) => {
			const text = data.text;
			const elem = createElement(listbox, opt.listItemTag, { 'class': opt.listItemClass }, text);
			if (opt.highlight) {
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
			const json = JSON.stringify(data).replace(/"/g, '&#34;');
			elem.setAttribute('data-json', json);
		});
		const rect = getListPlacement();
		listbox.style.top = rect.top + 'px';
		listbox.style.left = rect.left + 'px';
		listbox.scrollTop = 0;
		selectedIndex = -1;
		if (isFunction(opt.open)) {
			opt.open(listbox);
		}
	}
	function hide() {
		listbox.innerHTML = '';
		listbox.style.display = 'none';
	}
	function navigate(e) {
		const key = e.key;
		if (key === 'ArrowUp') {
			e.preventDefault();
			previous();
			return;
		} else if (key === 'ArrowDown') {
			e.preventDefault();
			next();
			return;
		} else if (key === 'Enter' || key === 'Tab') {
			const selected = listbox.querySelector('.selected');
			if (selected) {
				e.preventDefault();
				selected.click();
				return;
			}
		}
		hide();
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
		const selectedItem = items[selectedIndex];
		if (selectedItem) {
			selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}
	function createIndexes(suggestions) {
		return new Promise((resolve, reject) => {
			if (isArrayOfStrings(suggestions)) {
				resolve(create(suggestions));
			} else if (isArrayOfStrings(suggestions[0])) {
				const array = [];
				suggestions.forEach((arr) => {
					array.push(create(arr));
				});
				resolve(array);
			} else {
				reject('Must be an array of strings or an array of arrays of strings');
			}
			function create(array) {
				array = array.slice();
				array.sort();
				let i = opt.threshold;
				const obj = {},
					num = Math.max(i + 1, 4);
				for (i; i < num; i++) {
					let start = -1, prev;
					while (++start < array.length && !(prev = getKey(array[start], i)));
					array.forEach((str, k) => {
						const key = getKey(str, i);
						if (key && key !== prev) {
							obj[prev] = add(obj[prev], start, k);
							start = k;
							prev = key;
						}
					});
					obj[prev] = add(obj[prev], start, array.length);
				}
				function add(arr, start, end) {
					if ( !arr) arr = [];
					arr.unshift([start, end]);
					return arr;
				}
				return { array, indexes: obj };
			}
		});
	}
	function getIndexes(str, indexes) {
		const num = Math.min(opt.threshold + 1, str.length);
		for (let r = num; r >= 1; r--) {
			const key = getKey(str, r),
				array = indexes[key];
			if (array) return array;
		}
		return null;
	}
	function getKey(str, num) {
		return str.length < num ? null : getValue(str.substr(0, num));
	}
	function isArrayOfStrings(obj) {
		return Array.isArray(obj) && obj.length && typeof obj[0] === 'string';
	}
	function getSuggestions(obj) {
		const results = [],
			query = getValue(obj.query),
			startsWith = opt.startsWith,
			suggestions = opt.suggestions;
		let count = 0;
		if (Array.isArray(suggestions)) {
			if (isArrayOfStrings(suggestions)) {
				search(suggestions, 0, suggestions.length, 0, 0);
			} else if (isArrayOfStrings(suggestions[0])) {
				suggestions.forEach((arr, i) => {
					search(arr, 0, arr.length, i, 0);
				});
			} else {
				suggestions.forEach((obj, i) => {
					processIndexes(obj, i);
				});
			}
		} else {
			processIndexes(suggestions, 0);
		}
		function processIndexes(obj, index) {
			const indexes = obj['indexes'],
				array = getIndexes(query, indexes);
			if ( !array) {
				log('Array of indexes is undefined for ', obj.query);
				return;
			}
			array.forEach((arr, i) => {
				search(obj['array'], arr[0], arr[1], index, i);
			});
		}
		function search(array, i, length, arrayIndex, sortIndex) {
			for (i; i < length; i++) {
				const text = array[i],
					index = getValue(text).indexOf(query);
				if (startsWith ? index === 0 : index >= 0) {
					if (++count >= opt.maxResults) break;
					results.push({ text, query: obj.query, trigger: obj.trigger, startIndex: index, arrayIndex, sortIndex });
				}
			}
		}
		log('Suggestion count =', results.length);
		return results;
	}
	function getValue(str, normal) {
		if ( !str) return '';
		str = opt.caseSensitive ? str : str.toLowerCase();
		return normal ? str : diacritics.replace(str);
	}
	function getListPlacement() {
		listbox.style.display = 'block';
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
		return { top: top, left: left };
	}
	function replaceQuery(elem) {
		isReplaced = true;
		let json, text;
		if ( !elem || !(json = elem.getAttribute('data-json'))) return;
		const data = JSON.parse(json.replace(/&#34;/g, '"'));
		text = data.text;
		if (isFunction(opt.select)) {
			text = opt.select(data);
		}
		if ( !text) {
			hide();
			return;
		}
		if (isContentEditable) {
			contentEditable.replace(context, data.query, text);
		} else {
			textarea.replace(context, data.query, text);
		}
		const event = opt.event;
		if (event && (event instanceof KeyboardEvent || event instanceof InputEvent)) {
			context.dispatchEvent(event);
		}
		hide();
	}
	function isFunction(obj) {
		return typeof obj === 'function';
	}
	function debounce(callback, duration) {
		let id;
		return function() {
			clearTimeout(id);
			id = setTimeout(() => { callback(); }, duration);
		};
	}
	function log() {
		if (opt.debug) {
			console.log(libName + ': ' + Array.from(arguments).join(' '));
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
}

export { autoComplete as default };
