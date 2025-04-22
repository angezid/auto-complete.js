
import { createElement } from '../src/util';

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
		// set cursor at the end of text
		elem.selectionStart = elem.selectionEnd = queryIndex + text.length;
	},

	// from https://github.com/component/textarea-caret-position; undergoes refactoring, bugs fixing and adaptation
	getCaretCoordinates: function(elem, caretIndex) {
		const rect = elem.getBoundingClientRect(),
			isInput = elem instanceof HTMLInputElement,
			text = elem.value,
			content = text.substring(0, caretIndex),
			style = window.getComputedStyle(elem),

			div = createElement(document.body, 'div', null, isInput ? content.replace(/\s/g, '\u00a0') : content),
			span = createElement(div, 'span', null, text || '.');

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

export default textarea;

