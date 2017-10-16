// summary:
//		dom manipulation closure

export default {
	hide(node, state) {
		// summary:
		//		hide/show a node
		node.classList.toggle('hidden', state);
	},
};
