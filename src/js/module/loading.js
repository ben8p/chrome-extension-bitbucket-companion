// summary:
//		loading closure

export default {
	update(state) {
		// summary:
		//		set the loading state (according to the queue)

		chrome.storage.local.set({
			loading: state,
		}, () => true);
	},
	isLoading() {
		// summary:
		//		return a promise which resolve to true or false
		return new Promise(((resolve) => {
			chrome.storage.local.get({
				loading: false,
			}, (items) => {
				resolve(items.loading);
			});
		}));
	},
};
