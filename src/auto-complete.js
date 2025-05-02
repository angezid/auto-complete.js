
import regCreator from '../src/regExpCreator';
import contentEditable from '../src/contentEditable';
import textarea from '../src/textarea';
import diacritics from '../src/diacritics';
import { createElement } from '../src/util';

'use strict';

export default function autoComplete(ctx, options) {

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
		//suggestions : [],
		queryChars: '\\d\\p{L}_-',
		triggerChars: '\\s!"#$%&\'()*+,-./:;<=>?@[]\\^`{|}~',
		//regex : null,
		listTag: 'ul',
		listItemTag: 'li',
		listClass: name + '-list',
		listItemClass: name + '-item',
		listOffsetX: 5,
		listOffsetY: 5,
		//caseSensitive : false,
		debounce: 1,
		threshold: 1,
		maxResults: 100,
		//filter : (array) => {},
		//listItem : (elem, data) => {},
		//select : (data) => {},
		debug: false,
	}, options);

	const processDebounce = debounce(process, opt.debounce);

	registerElement(ctx);

	if (context) {
		createListbox();
		registerEvents();
		diacritics.init();

		listSelector = `${opt.listTag}.${opt.listClass}`;
		queryRegex = (opt.regex instanceof RegExp) ? opt.regex : regCreator.create(opt, libName);
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
		addEvent(window, 'load', hideLists);    // FireFox displays all lists on load
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
				array = opt.filter(array) || array;    // in case of modification of existing array
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
		// sorts by the priority of query substring is more closer to the beginning of suggestion string
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

		if (isFunction(opt.show)) {
			opt.show(listbox);
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

		// Ensure the selected item is visible in the list
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
		// must be set first
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
		/*else if (opt.startsWith) {
			text = data.query + text.substr(data.query.length);
		}*/

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

