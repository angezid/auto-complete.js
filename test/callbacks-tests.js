
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory(root));

	} else if (typeof exports === 'object') {
		module.exports = factory(root);

	} else {
		root.callbacksTests = factory(root);
	}
})(typeof global !== "undefined" ? global : this.window || this.global, function(root) {
	'use strict';
	// all words with diacritics characters are just for testing, they're not real
	
	const opts = [{ threshold: 1, }, { threshold: 2 }, { threshold: 3 }, { threshold: 4 }];
	const timeScale = 1,
		maxThreshold = 4;
	let testProgress, progressStep;

	function callbacksTests(options) {
		testProgress = document.getElementById('callbacks-progress');
		progressStep = 0.33;

		if (options) {
			opts.forEach((opt, i) => { opts[i] = { ...opt, ...options } });
		}

		this.runTests = (done) => {
			runTests(done);
			//done();
		};
	}

	async function runTests(done) {
		await runListItemCallbackTest();
		clear();
		await runSelectCallbackTest();
		clear();
		testProgress.value = 100;
		done();
	}

	async function runSelectCallbackTest() {
		const array = ["adjective", "adjective2", "ádjective", "adjectíve", ],
			tags = ['input', 'textarea', 'div', 'blockquote'],
			//tags = ['div'],
			title = '\'select()\' callback';

		for await (const tag of tags) {
			await testSelectCallbacks(array, tag, title);
			clear();
		}
	}

	async function testSelectCallbacks(array, tag, title) {
		for await (const opt of opts) {
			await testSelect(array, opt, tag, title);
		}
		//await testSelect(array, opts[0], tag, title);
	}

	async function testSelect(array, opt, tag, title) {
		return new Promise((resolve) => {
			const option = { optimize: false, ...opt };

			testSelectCallback(array, option, tag, (success, obj) => {
				const msg = ' for \'' + tag + '\', \'threshold: ' + opt.threshold + '\' test ' + (success ? 'passed' : 'failed');
				logTestResults(title + msg);

				if (opt.debugRuns) console.log(obj);
				resolve();
			});
		});
	}

	async function testSelectCallback(testArray, options, tag, done) {
		let startIndex = 0,
			maxStartIndex = 3,
			length = 1,
			index = -1,
			query = '',
			selectedText = '',
			success = true,
			open = 0,
			select = 0;

		const opt = {
			suggestions: testArray,
			open: listbox => {
				selectListItem(listbox);
				open++;
			},
			select: data => {
				checkData(data);
				select++;
				return data.text;
			},
			event: new InputEvent("input", { inputType: 'insertReplacementText' }),
			...options
		};

		const { editor } = createElement(opt, tag);
		editor.addEventListener('input', checkReplacement);

		const runs = (opts.length - opt.threshold + 1) * maxThreshold * (maxStartIndex + 1);
		start();

		async function start() {
			if (++index >= testArray.length) {
				if (++length > maxThreshold) {
					length = 1;

					if (++startIndex > maxStartIndex) {
						success = success && open === runs && select === runs;
						done(success, { runs, open, select });
						return;
					}
					progress();
				}
				index = 0;
				progress();
			}

			if (length < opt.threshold) {
				start();
				return;
			}

			const text = testArray[index];
			query = text.substr(startIndex, length);
			setText(editor, query);
			await dispatchEvent(editor, new InputEvent("input", { inputType: 'insertText' }));
		}

		async function selectListItem(listbox) {
			for (let i = 0; i < length; i++) {
				await dispatchEvent(editor, new KeyboardEvent("keydown", { key: 'ArrowDown' }));
			}

			const selected = listbox.querySelector('.selected');
			selectedText = selected ? selected.textContent : '';

			if (selected) {
				await dispatchEvent(editor, new KeyboardEvent("keydown", { key: 'Enter' }));
			}
		}

		function checkReplacement(e) {
			if (e.inputType !== 'insertReplacementText') return;

			const text = getText(e.target);

			if (text !== selectedText) {
				console.log('getText()', text, '|', selectedText);
				success = false;
			}
			start();
		}

		function checkData(data) {
			if (data.query !== query) {
				console.log('data.query', data.query, query);
				success = false;
			}

			if (typeof data.trigger === 'undefined') {
				console.log('data.trigger', data.trigger);
				success = false;
			}

			if ( !testArray.find((str) => str === data.text)) {
				console.log('data.text', data.text);
				success = false;
			}

			if (data.startIndex !== startIndex) {
				console.log('data.startIndex', data.startIndex, startIndex);
				success = false;
			}
		}
	}

	async function runListItemCallbackTest() {
		const array = ["able", "bāck", "call", ],
			title = '\'listItem()\' callback';

		const option = { optimize: false, ...opts[0] };
		await testListItemCallback(array, option, title);
	}

	function testListItemCallback(array, opt, title) {
		return new Promise((resolve) => {
			testItemCallback(array, opt, (success, obj) => {
				const msg = ' test ' + (success ? 'passed' : 'failed');
				logTestResults(title + msg);

				if (opt.debugRuns) console.log(obj);
				resolve();
			});
		});
	}

	function testItemCallback(testArray, options, done) {
		let length = 1,
			index = -1,
			open = 0,
			query = '',
			listTag = 'div',
			listClass = 'list',
			itemTag = 'span',
			itemClass = 'item-class',
			success = true,
			text;

		const opt = {
			suggestions: testArray,
			listTag: listTag,
			listClass: listClass,
			listItemTag: itemTag,
			listItemClass: itemClass,
			startsWith: true,
			highlight: true,
			listItem:(element, data) => {
				checkElement(element);
				checkData(data);
			},
			open: listbox => {
				open++;
				listbox.style.display = 'none';
				start();
			},
			...options
		};

		const { editor } = createElement(opt);
		const runs = testArray.length * maxThreshold - testArray.length * (opt.threshold - 1);
		start();

		async function start() {
			if (++index >= testArray.length) {
				if (++length > 4) {
					success = success && open === runs;
					done(success, { runs, open });
					return;
				}
				index = 0;
				progress();
			}

			text = testArray[index];
			query = text.substr(0, length);
			setText(editor, query);
			await dispatchEvent(editor, new InputEvent("input", { inputType: 'insertText' }));
		}

		function checkData(data) {
			if (data.query !== query) {
				console.log('data.query', data.query, query);
				success = false;
			}

			if (typeof data.trigger === 'undefined') {
				console.log('data.trigger', data.trigger);
				success = false;
			}

			if (data.startIndex !== 0) {
				console.log('data.startIndex', data.startIndex);
				success = false;
			}

			if ( !testArray.find((str) => str === data.text)) {
				console.log('data.text', data.text);
				success = false;
			}
		}

		function checkElement(element) {
			const parent = element.parentNode;

			if (parent.tagName.toLowerCase() !== listTag) {
				console.log('listItem.parentNode.tagName', parent.tagName);
				success = false;
			}

			if (parent.className !== listClass) {
				console.log('listItem.parentNode.className', element.className);
				success = false;
			}

			if (element.tagName.toLowerCase() !== itemTag) {
				console.log('listItem.tagName', element.tagName);
				success = false;
			}

			if (element.className !== itemClass) {
				console.log('listItem.className', element.className);
				success = false;
			}

			if (opt.highlight) {
				const mark = element.querySelector('mark');
				if ( !mark) {
					console.log('mark', mark);
					success = false;

				} else {
					if (mark.textContent !== query) {
						console.log('mark.textContent', mark.textContent);
						success = false;
					}
				}
			}
		}
	}

	function dispatchEvent(elem, event) {
		return new Promise((resolve) => {
			setTimeout(() => {
				elem.dispatchEvent(event);
				resolve();
			}, 5 * timeScale);
		});
	}

	function createElement(options, tag = 'input') {
		const editor = document.createElement(tag),
			instance = new autoComplete(editor, options);

		if ( !isText(editor)) {
			if (tag === 'div') {
				editor.setAttribute('contenteditable', 'plaintext-only');
				if (editor.contentEditable !== 'plaintext-only') {
					editor.setAttribute('contenteditable', 'true');
					logTestResults('Browser does not supports contenteditable \'plaintext-only\' state');
				}
			}
			else editor.setAttribute('contenteditable', 'true');
		}
		editor.setAttribute('spellcheck', 'false');
		document.body.appendChild(editor);

		return { editor, instance };
	}
	
	function setText(elem, text) {
		const ch = elem instanceof HTMLInputElement || Math.round(Math.random()) ? ' ' : '\n';
		
		if (isText(elem)) {
			elem.value = (elem.value && elem.value.length < 100 ? elem.value + ch : '') + text;
			return;
		}
		
		const content = elem.textContent;
		text = (content && content.length < 100 ? content + ch : '') + text;
		const textNode = document.createTextNode(text);
		elem.innerHTML = '';
		elem.appendChild(textNode);

		const sel = elem.getRootNode().getSelection(),
			offset = textNode.textContent.length;
		sel.setBaseAndExtent(textNode, offset, textNode, offset);
	}

	function getText(elem) {
		const text = isText(elem) ? elem.value : elem.textContent;
		return text.replace(/(?:^[^]+?\s|^\s?)(\S+)$/, '$1'); 
	}

	function isText(elem) {
		return elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement;
	}

	function progress(msg) {
		testProgress.value += progressStep;
	}

	function logError(error) {
		console.error(error);

		const results = document.querySelector('#results');
		const p = document.createElement('p');
		p.className = 'error';
		p.textContent = error;
		results.appendChild(p);
	}

	function logTestResults(text) {
		console.log(text);

		const results = document.querySelector('#results');
		const p = document.createElement('p');

		text = text.replace(/'([^']+)'/g, '<code>$&</code>');

		p.innerHTML = text.replace(/(?:failed|passed)/, rm => {
			return '<span class="' + rm + '">' + rm + '</span>';
		});

		results.appendChild(p);
		p.scrollIntoView({
			block: 'nearest',
			behavior: 'instant'
		});
	}

	function clear() {
		const elems = document.querySelectorAll('#test-area ~ *');
		elems.forEach((elem) => {
			document.body.removeChild(elem);
		});
	}
	return callbacksTests;
});

