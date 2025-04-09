
const contentEditable = {
	caretCoordinates : null,

	getText : function(elem) {
		const rng = this.getSelection(elem).getRangeAt(0),
			range = document.createRange();

		range.selectNodeContents(elem);
		range.setEnd(rng.startContainer, rng.startOffset);

		let rect = rng.getBoundingClientRect();

		if (rect.x === 0 && rect.y === 0) {
			rect = rng.startContainer.getBoundingClientRect();
		}
		this.caretCoordinates = rect;

		return range.toString();
	},

	replace : function(elem, query, text) {
		const len = this.getText(elem).length;

		this.select(elem, len - query.length, len);

		const obj = { '<' : '&lt;', '>' : '&gt;', '&' : '&amp;', '"' : '&quot;', '\'' : '&#039;' };

		document.execCommand('insertHTML', false, text.replace(/[<>&"']/g, m => obj[m]));
	},

	select : function(elem, start, end) {
		const selection = this.getSelection(elem);
		let startNode,
			endNode,
			startOffset = 0,
			endOffset = 0,
			previous = 0,
			node;

		const iterator = document.createNodeIterator(elem, NodeFilter.SHOW_TEXT);
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
	},

	getSelection : function(elem) {
		return elem.getRootNode().getSelection();
	},
};

export default contentEditable;
