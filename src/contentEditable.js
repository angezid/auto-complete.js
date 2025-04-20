
const contentEditable = {
	caretCoordinates : null,

	getText : function(elem, textContent) {
		const selection = this.getSelection(elem),
			rng = selection.getRangeAt(0),
			startNode = rng.startContainer,
			startOffset = rng.startOffset;

		let text = '';

		if (elem.contentEditable !== 'true' || textContent) {
			const range = document.createRange();
			range.selectNodeContents(elem);
			range.setEnd(startNode, startOffset);
			text = range.toString();

			if (textContent) return text;

		} else {
			selection.setBaseAndExtent(elem, 0, startNode, startOffset);
			text = selection.toString();
			selection.collapse(startNode, startOffset);
		}

		let rect = rng.getBoundingClientRect();

		if (rect.x === 0 && rect.y === 0) {
			rect = startNode.getBoundingClientRect();
		}
		this.caretCoordinates = rect;

		return text;
	},

	replace : function(elem, query, text) {
		const len = this.getText(elem, true).length;

		this.select(elem, len - query.length, len);
		document.execCommand('insertText', false, text);
	},

	select : function(elem, start, end) {
		let startNode,
			endNode,
			startOffset = 0,
			endOffset = 0,
			previous = 0,
			node;

		const iterator = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT);
		while (node = iterator.nextNode()) {
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

	getSelection : function(elem) {
		return elem.getRootNode().getSelection();
	},
};

export default contentEditable;
