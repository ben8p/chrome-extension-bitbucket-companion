import on from './module/on';

chrome.runtime.sendMessage({ isBitbucketServer: document.location.href }, (isBitbucketServer) => {
	if (!isBitbucketServer) { return; }
	const refresh = () => {
		chrome.runtime.sendMessage({ refresh: document.location.href }, () => true);
	};
	const actionButtons = document.querySelector('.pull-request-actions .reviewer-status-selector');
	if (actionButtons) {
		on(actionButtons, 'click', refresh);
	}
	on(window, 'unload', refresh);
	refresh();
});
