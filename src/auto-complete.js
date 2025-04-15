
import regCreator from "../src/regExpCreator";
import contentEditable from "../src/contentEditable";
import textarea from "../src/textarea";
import diacritics from "../src/diacritics";
import { createElement } from "../src/util";

'use strict';

export default function autoComplete(ctx, options) {
	this.ctx = ctx;
	this.options = options;

	this.newElement = function(ctx) {
		removeElementEvents();
		registerElement(ctx)
	}

	this.destroy = function(ctx) {
		removeElementEvents();
		removeEvents();
	}

	this.createIndexes = function(array) {
		return createIndexes(array);
	}

	const name = 'auto-complete',
		libName = 'auto-complete.js';

	let context,
		queryRegex,
		caretCoords,
		listbox,
		listSelector,
		isContentEditable,
		itemsLength = 0,
		selectedIndex = 0;

	const opt = Object.assign({}, {
		//suggestions : [],
		queryChars : '\\d\\p{L}_-',
		triggerChars : '\\s!"#$%&\'()*+,-./:;<=>?@[]\\^`{|}~',
		//regex : null,
		listTag : 'ul',
		listItemTag : 'li',
		listClass : name + '-list',
		listItemClass : name + '-item',
		listOffsetX : 5,
		listOffsetY : 5,
		//caseSensitive : false,
		debounce : 1,
		threshold : 1,
		maxResults : 100,
		//filter : (array) => {},
		//listItem : (elem, data) => {},
		//select : (data) => {},
		debug : false,
	}, this.options);

	context = registerElement(this.ctx);

	if (context) {
		createListbox();
		registerEvents();
		diacritics.init();

		listSelector = `${opt.listTag}.${opt.listClass}`;
		queryRegex = (opt.regex instanceof RegExp) ? opt.regex : regCreator.create(opt, libName);
		log(libName + ': RegExp - /' + queryRegex.source + '/' + queryRegex.flags);

		if (opt.optimize && opt.startsWith) {
			createIndexes(opt.suggestions).then((obj) => {
				opt.suggestions = obj;
			});
		}
	}

	function registerElement(ctx) {
		const elem = typeof ctx === 'string' ? document.querySelector(ctx) : ctx;

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
		setTimeout(function() {
			document.querySelectorAll(listSelector).forEach(elem => { elem.style.display = 'none'; });
		}, 20);
	}

	function outsideClick(e) {
		if ( !listbox.contains(e.target)) hide();
	}

	function onInput() {
		debounce(process(), opt.debounce);
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

			} else if((query = rm[2])) {
				trigger = rm[1];
			}

			log(`${libName}: trigger = '${trigger}' query = '${query}`);
			return { trigger, query };
		}

		const len = text.length;
		log(libName + ': No match. ', len > 20 ? ' ... ' + text.slice(len - 20) : text);
		return null;
	}

	function show(list) {
		const array = [],
			custom = isFunction(opt.listItem);
		listbox.innerHTML = '';

		list.forEach((data, i) => {
			const text = data.text;
			const elem = createElement(listbox, opt.listItemTag, opt.listItemClass, text);

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

			const json = JSON.stringify(data).replaceAll('"', '&#34;');
			elem.setAttribute('data-json', json);
		});

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

	function navigate(e) {
		const key = e.key;

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
			
			const selected = listbox.querySelector('.selected');
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
		const items = document.querySelectorAll(`${listSelector} > ${opt.listItemTag}`);

		items.forEach((item, index) => {
			item.classList.toggle('selected', index === selectedIndex);
		});

		// Ensure the selected item is visible in the list
		const selectedItem = items[selectedIndex];
		if (selectedItem) {
			selectedItem.scrollIntoView({ block : 'nearest', behavior : 'smooth' });
		}
	}

	function createIndexes(array) {
		return new Promise(function(resolve, reject) {
			array = array.slice();
			array.sort();

			let i = opt.threshold;
			const obj = {},
				num = Math.max(i + 1, 4);

			for (i; i < num; i++) {
				let start = -1, prev;
				while (++start < array.length && !(prev = getKey(array[start], i)));

				array.forEach(function(str, k) {
					var key = getKey(str, i);

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

			resolve({ array, indexes : obj });
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

	function getSuggestions(obj) {
		const results = [],
			query = getValue(obj.query),
			startsWith = opt.startsWith,
			suggestions = opt.suggestions;

		let count = 0;

		if (Array.isArray(suggestions)) {
			collect(suggestions, 0, suggestions.length);

		} else {
			const indexes = suggestions['indexes'],
				array = getIndexes(query, indexes);

			if ( !array) {
				log(libName + ': Array of indexes is undefined for ', obj.query);
				return results;
			}

			array.forEach((arr) => {
				collect(suggestions['array'], arr[0], arr[1]);
			});
		}

		function collect(array, i, length) {
			for (i; i < length; i++) {
				const text = array[i],
					index = getValue(text).indexOf(query);

				if (startsWith ? index === 0 : index >= 0) {
					if (++count >= opt.maxResults) break;

					results.push({ text, query : obj.query, trigger : obj.trigger, startIndex : index });
				}
			}
		}

		log(libName + ': Suggestion count =', results.length);
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

		return { top : top, left : left };
	}

	function replaceQuery(elem) {
		let json, text;

		if ( !elem || !(json = elem.getAttribute('data-json'))) return;

		const data = JSON.parse(json.replaceAll('&#34;', '"'));
		text = data.text;

		if (isFunction(opt.select)) {
			text = opt.select(data);
		}
		//else if (opt.startsWith) {
			//text = data.query + text.substr(data.query.length);
		//}

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
		let id;
		return function() {
			clearTimeout(id);
			id = setTimeout(() => { callback(); }, duration);
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























