
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory(root));

	} else if (typeof exports === 'object') {
		module.exports = factory(root);

	} else {
		root.searchingTests = factory(root);
	}
})(typeof global !== "undefined" ? global : this.window || this.global, function(root) {
	'use strict';
	// all words with diacritics characters are just for testing, they're not real
	const array1 = ["able", "back", "call", "dark", "each", "fact", "gain", "half", "idle", "joke"];
	const array2 = ["able2", "back2", "call2", "dark2", "each2", "fact2", "gain2", "half2", "idle2", "joke2"];
	const array3 = ["áble3", "bāck3", "câll3", "därk3", "eách3", "fáct3", "gáin3", "hálf3", "ídle3", "jóke3"];

	const opts = [{ threshold: 1, }, { threshold: 2 }, { threshold: 3 }, { threshold: 4 }];
	const timeScale = 1,
		maxThreshold = 4;

	let testProgress, progressStep;

	function searchingTests(options) {
		testProgress = document.getElementById('searching-progress');
		progressStep = 0.25;

		if (options) {
			opts.forEach((opt, i) => { opts[i] = { ...opt, ...options } });
		}

		this.runTests = (done) => {
			runTests(done);
			//done();
		};
	}

	async function runTests(done) {
		testInfo('Indexed object creation test');
		await runIndexedObjectCreationTest();

		testInfo('Searching test');
		toRandomCase([array1, array2, array3]);
		await runSearchingTest();

		testInfo('Case sensitive searching test');
		await runSearchingTestCaseSensitive();
		testProgress.value = 100;
		done();
	}

	async function runIndexedObjectCreationTest() {
		await testSingleArrayIndexObjectCreation();
		await testArrayOfArrayIndexObjectCreation();
	}

	async function runSearchingTest() {
		const tags = ['input', 'textarea', 'div', 'blockquote'];

		for await (const tag of tags) {
			await testSearchingSingleArray(tag);
			clear();
			await testSearchingArrayOfArray(tag);
			clear();
			await testSearchingSingleArrayIndexedObject(tag);
			clear();
			await testSearchingArrayOfArrayIndexedObject(tag);
			clear();
		}
	}

	function toRandomCase(array) {
		array.forEach((arr) => {
			arr.forEach((word, i) => {
				arr[i] =Array.from(word).map(ch => Math.round((Math.random())) ? ch.toUpperCase() : ch.toLowerCase()).join('');
			});
		});
	}

	async function runSearchingTestCaseSensitive() {
		toRandomCase([array1]);

		for (let i = 0; i < array1.length; i++) {
			const word = array1[i];
			array2[i] =Array.from(array2[i]).map((letter, j) => convertCase(j, word, letter)).join('');
			array3[i] =Array.from(array3[i]).map((letter, j) => convertCase(j, word, letter)).join('');
		}

		function convertCase(i, word, letter) {
			const toUpper = i < word.length && word[i] === word[i].toUpperCase();
			return toUpper ? letter.toUpperCase() : letter.toLowerCase();
		}

		opts.forEach((opt, i) => { opts[i] = { ...opt, caseSensitive: true } });

		await runSearchingTest();
	}

	async function testSingleArrayIndexObjectCreation() {
		const title = 'Single array indexed object creation; ';

		for await (const opt of opts) {
			const instance = new autoComplete(null, opt);
			const obj = await instance.createIndexes(array1);

			const success = testObject(array1, opt, obj);
			const msg = title + '\'threshold: ' + opt.threshold + '\' test ' + (success ? 'passed' : 'failed');
			logTestResults(msg);
		}
	}

	async function testArrayOfArrayIndexObjectCreation() {
		const array = [array1, array2, array3],
			title = 'Array of array indexed object creation; ';

		for await (const opt of opts) {
			const instance = new autoComplete(null, opt);
			const obj = await instance.createIndexes(array);

			const success = testArrayOfArrayObject(array, opt, obj);
			const msg = title + '\'threshold: ' + opt.threshold + '\' test ' + (success ? 'passed' : 'failed');
			logTestResults(msg);
		}
	}

	function testArrayOfArrayObject(testArray, opt, indexedObject) {
		let success = true;

		indexedObject.forEach((obj, i) => {
			if ( !testObject(testArray[i], opt, obj)) success = false;
		});
		return success;
	}

	function testObject(testArray, opt, obj) {
		const array = obj['array'],
			indexes = obj['indexes'],
			num = Math.max(opt.threshold, 3) - opt.threshold + 1;

		let success = true;

		const map = new Map(Object.entries(indexes));

		if (array.length !== testArray.length) {
			console.log('array.length', array.length);
			success = false;
		}

		if (map.size !== testArray.length * num) {
			console.log('map.size', map.size);
			success = false;
		}
		return success;
	}

	async function testSearchingSingleArray(tag) {
		const array = array1.concat(array3),
			title = 'Single array searching';

		for await (const opt of opts) {
			const option = { optimize: false, ...opt };
			await testSearching(array, option, tag, 2, title);
		}
	}

	async function testSearchingArrayOfArray(tag) {
		const array = [array1, array2, array3],
			title = 'Array of array searching';

		for await (const opt of opts) {
			const option = { optimize: false, ...opt };
			await testSearching(array, option, tag, 3, title);
		}
	}

	async function testSearchingSingleArrayIndexedObject(tag) {
		const title = 'Single array indexed object searching';

		for await (const opt of opts) {
			await testSearching(array1, opt, tag, 1, title);
		}
	}

	async function testSearchingArrayOfArrayIndexedObject(tag) {
		const array = [array1, array2, array3],
			title = 'Array of array indexed object searching';

		for await (const opt of opts) {
			await testSearching(array, opt, tag, 3, title);
		}
	}

	function testSearching(array, opt, tag, num, title) {
		return new Promise((resolve) => {
			testArraySearching(array, opt, tag, num, (success, editor, obj) => {
				const attr = isText(editor) ? '' : '\'contenteditable="' + editor.contentEditable + '"\', ';
				const caseSensitive = opt.caseSensitive ? '\'caseSensitive="true"\', ' : '';
				const msg = '; \'' + tag + '\', ' + attr + caseSensitive + '\'threshold: ' + opt.threshold + '\' test ' + (success ? 'passed' : 'failed');
				logTestResults(title + msg);

				if (opt.debugRuns) console.log(obj);
				resolve();
			});
		});
	}

	function testArraySearching(testArray, options, tag, num, done) {
		let length = 1,
			index = -1,
			query = '',
			success = true,
			filter = 0,
			runs = 0,
			text;

		const opt = {
			suggestions: testArray,
			//startsWith: true,
			filter: array => {
				filter++;
				checkFilterResults(array);
				start();
			},
			open: listbox => {
				setTimeout(() => {
					listbox.style.display = 'none';
				}, 1);
			},
			...options
		};

		if (opt.threshold === 1) {
			opt.startsWith = true;
		}

		const { editor } = createElement(opt, tag);

		testArray = testArray.flat();
		//const runs = testArray.length * maxThreshold - testArray.length * (opt.threshold - 1);
		const full = opt.fullTest;

		start();

		async function start() {
			// running tests for whole array is lengthy and unnecessary; getNext() picks randomly the array index
			if (full && ++index >= testArray.length || !full && !(index = getNext(index, testArray.length))) {
				if (++length > maxThreshold) {
					success = success && runs > 0 && filter === runs;
					done(success, editor, { runs, filter });
					return;
				}
				index = 0;
				progress();
			}

			if (length < opt.threshold) {
				start();
				return;
			}

			text = testArray[index];
			query = text.substr(0, length);
			setText(editor, query);
			await dispatchEvent(editor, new InputEvent("input", { inputType: 'insertText' }));
			runs++;
		}

		function getNext(min, max) {
			const multiplier = min <= 0 ? max / 2 : max - min + 1;
			let next = Math.floor((Math.random() * multiplier) + min) + 1;
			return next >= max ? 0 : next;
		}

		function checkFilterResults(array) {
			if (array.length !== num) {
				console.log('array.length', array.length, num);
				success = false;

			} else {
				const obj = array[0];

				if (obj.query !== query) {
					console.log('obj.query', obj.query, query);
					success = false;
				}

				if ( !array.find((obj) => obj.text === text)) {
					console.log('obj.text', text);
					success = false;
				}
			}
		}
	}

	function dispatchEvent(editor, event) {
		return new Promise((resolve) => {
			setTimeout(() => {
				editor.dispatchEvent(event);
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
					logTestResults('This browser does not supports contenteditable \'plaintext-only\' state');
				}

			} else editor.setAttribute('contenteditable', 'true');
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

	function isText(elem) {
		return elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement;
	}

	function progress() {
		testProgress.value += progressStep;
	}

	function testInfo(text) {
		const results = document.querySelector('#results');
		const h4 = document.createElement('h4');
		h4.textContent = text;
		results.appendChild(h4);
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

	return searchingTests;
});

