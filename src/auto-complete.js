
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

		const opt = Object.assign({}, {
			queryChars : null,
			triggerChars : null,
			regex : null,
			//wrapper : true,
			ignoreCase : true,
			debounce : 0,
			threshold : 1,
			suggestions : [],
			maxResults : 10,
			debug : false,
		}, options);

		const listClass = 'autocomplete-list',
			listItemClass = 'autocomplete-item',
			suggestions = opt.suggestions.map(wd => { return { original : wd, lowercase : wd.toLowerCase() } });

		let target,
			listbox,
			queryRegex,
			clientRect,
			suggestionLength = 0,
			selectedIndex = 0;

		autoComplete.init = function() {
			if (typeof ctx === 'string') {
				target = document.querySelector(ctx);

			} else if (ctx instanceof HTMLElement) {
				target = ctx;
			}

			if (opt.regex && opt.regex instanceof RegExp) {
				queryRegex = opt.regex;

			} else {
				const queryChars = preprocess(opt.queryChars) || '\\p{L}';
				let chars = opt.triggerChars;

				if (chars) {
					chars = chars.replace(/\s/g, ' ');
					chars = preprocess(chars).replace(' ', '\\s');
				}

				chars = chars || '\\s$+<=>^`|~\\p{P}';
				queryRegex = new RegExp('(^|[' + chars + '])([' + queryChars + ']+)$', 'u');
			}
			log('init(): queryRegex - ' + queryRegex.source);
		};

		autoComplete.init();
		createListbox();
		registerEvents();

		/*if (opt.wrapper) {
			const wrapper = document.createElement('div');
		}*/

		function createListbox() {
			listbox = document.createElement('ul');
			listbox.setAttribute('class', listClass);
			listbox.setAttribute("hidden", "");
			document.body.appendChild(listbox);
			listbox.addEventListener('mousedown', (e) => e.preventDefault());
		}

		function registerEvents() {
			target.addEventListener('input', onInput);
			target.addEventListener('blur', hide);
			target.addEventListener('keydown', navigateList);
			window.addEventListener('resize', hide);
			document.addEventListener('click', onOutsideClick);
		}

		function onInput() {
			const obj = getQuery();

			if (obj && obj.query.length >= opt.threshold && clientRect) show(obj);
			else hide();
		}

		function navigateList(e) {
			if (listbox.hasAttribute('hidden')) return;

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
			//selectedIndex = (selectedIndex + 1) % suggestionLength;
			selectedIndex = selectedIndex >= suggestionLength - 1 ? 0 : selectedIndex + 1;
			update();
		}

		function previous() {
			selectedIndex = selectedIndex <= 0 ? suggestionLength - 1 : selectedIndex - 1;
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
				selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		}

		function onOutsideClick(e) {
			if ( !listbox.contains(e.target) && !listbox.contains(e.target)) hide();
		}

		function getQuery() {
			const rm = queryRegex.exec(getTextBeforeCaret());
			if (rm) {
				const match = opt.ignoreCase ? rm[0].toLowerCase() : rm[0],
					query = opt.ignoreCase ? rm[2].toLowerCase() : rm[2];

				return { match : match, query : query, charLength : rm[1].length }
			}

			log("getQuery(): Query regex is failed to match - " + queryRegex.source);
			return null;
		}

		function getTextBeforeCaret() {
			const rng = getSelection().getRangeAt(0),
				range = document.createRange();

			clientRect = rng.getBoundingClientRect();

			range.selectNodeContents(target);
			range.setEnd(rng.startContainer, rng.startOffset);
			return range.toString();
		}

		function show(obj) {
			const list = getSuggestions(obj);
			suggestionLength = list.length;

			if ( !suggestionLength) {
				hide();
				return;
			}

			listbox.innerHTML = '';

			list.forEach((item, i) => {
				const li = document.createElement('li');

				/*if (i === selectedIndex) {
					li.setAttribute('aria-selected', true);
				}*/

				li.setAttribute('class', 'autocomplete-item');
				li.textContent = item.listItem;

				li.addEventListener('click', () => {
					insert(item.insert);
				});
				listbox.appendChild(li);
			});

			const rect = getPlacement();
			listbox.style.top = rect.top + 'px';
			listbox.style.left = rect.left + 'px';

			listbox.removeAttribute('hidden');
			selectedIndex = -1;
		}

		function hide() {
			listbox.setAttribute('hidden', '');
		}

		function getSuggestions(obj) {
			let array = [],
				count = 0;

			for (let i = 0; i < suggestions.length; i++) {
				const original = suggestions[i].original,
					str = opt.ignoreCase ? suggestions[i].lowercase : original,
					index = str.indexOf(obj.query);

				if (index === 0 || str.indexOf(obj.match) === 0) {
					if (++count > opt.maxResults) break;

					const offset = index === 0 ? obj.charLength : 0;
					array.push({ listItem : original, insert : original.substr(obj.match.length - offset) });
				}
			}
			array.sort((a, b) => b.length - a.length);

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
				top = clientRect.top - 20 - height;
			}

			return { top: top + 5, left: left + 5 };
		}

		function insert(text) {
			text = text.replace(/[<>&"']/g, m => {
				return m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '&' ? '&amp;' : m === '"' ? '&quot;' : '&#039;';
			});
			document.execCommand('insertHTML', false, text);
			hide();
		}

		function getSelection() {
			const root = target.getRootNode();
			if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				try { return root.getSelection(); } catch (e) { }
			}
			return window.getSelection();
		}

		function preprocess(value) {
			if (value && value.length) {
				const array = value.split(/(\\[pPu]\{[^}]+\}|\\[wdWDS]|.)/);
				// minimal length of unicode escape class, e.g. '\p{L}' is 5;
				return distinct(array).map(str => str.length > 4 || /\\[wdWDS]/.test(str) ? str : str.replace(/[-^\]\\]/g, '\\$&')).join('');
			}
			return null;
		}

		function distinct(array) {
			const result = [];
			array.forEach(item => {
				if ( !result.includes(item)) result.push(item);
			});
			return result;
		}

		function log(msg) {
			if (opt.debug) {
				console.log(msg);
			}
		}

		autoComplete.destroy = function() {
			target.removeEventListener('input', onInput);
			target.removeEventListener('blur', hide);
			target.removeEventListener('keydown', navigateList);
			document.removeEventListener('click', onOutsideClick);
			window.removeEventListener('resize', hide);
			document.body.removeChild(listbox);
		};
	}

	return autoComplete;
});























