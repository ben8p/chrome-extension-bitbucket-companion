
// summary:
//		module managing internationalization in HTML pages
//		Localize by replacing __MSG_***__ meta tags

export default function () {
	const nodes = document.getElementsByTagName('*');
	let j;
	let node;
	let innerHTML;
	let newInnerHTML;
	const matcher = (dummyMatch, value) => (value ? chrome.i18n.getMessage(value) : '');

	for (j = nodes.length - 1; j > 0; j--) {
		node = nodes[j];

		innerHTML = node.innerHTML.toString();
		newInnerHTML = innerHTML.replace(/__MSG_(\w+)__/g, matcher);

		if (newInnerHTML !== innerHTML) {
			node.innerHTML = newInnerHTML;
		}
	}
}
