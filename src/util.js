
function createElement(parent, name, className, content) {
	let elem = document.createElement(name);

	if (className) elem.setAttribute('class', className);
	if (content) elem.textContent = content;

	parent.appendChild(elem);
	return elem;
}

export { createElement }
