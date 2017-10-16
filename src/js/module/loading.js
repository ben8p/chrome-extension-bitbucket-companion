// summary:
//		loading closure

export default {
	update(state) {
		// summary:
		//		set the loading state (according to the queue)

		chrome.storage.local.get({
			loading: 0,
		}, (items) => {
			chrome.storage.local.set({
				loading: Math.max(0, items.loading + (state ? 1 : -1)),
			}, () => true);
		});
	},
	isLoading() {
		// summary:
		//		return a promise which resolve to true or false
		return new Promise(((resolve) => {
			chrome.storage.local.get({
				loading: 0,
			}, (items) => {
				resolve(items.loading > 0);
			});
		}));
	},
};
