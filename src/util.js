
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

export { createElement };
