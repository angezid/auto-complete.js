
const contentEditable = {
	caretCoordinates: null,

	getText: function(elem, textContent) {
		const selection = this.getSelection(elem);
		let text = '', 
			rng;

		if ( !selection.rangeCount || (rng = selection.getRangeAt(0)).startContainer === elem) {
			this.caretCoordinates = elem.getBoundingClientRect();
			return elem.textContent;
		}

		const startNode = rng.startContainer,
			startOffset = rng.startOffset;

		if (textContent || elem.contentEditable === 'plaintext-only' && !this.isFireFox) {
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

	replace: function(elem, query, text) {
		const len = this.getText(elem, true).length;
		// fixes problem when suggestion contains line breaks
		const asHtml = elem.contentEditable === 'true' || !this.isFireFox;

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

	isFireFox : function() {
		return /firefox/i.test(navigator.userAgent);
	}
};

export default contentEditable;

