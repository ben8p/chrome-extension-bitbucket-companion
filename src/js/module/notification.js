// summary:
//		show notifications
import API from './API';

chrome.notifications.onClicked.addListener(() => {
	API.getSettings().then((credentials) => {
		chrome.tabs.create({ url: credentials.restUrl });
	});
});

function setIcon(isError) {
	chrome.browserAction.setIcon({
		path: isError ? '/img/icon-error.png' : '/img/icon.png',
	});
}

export default function (title, message, options = {}) {
	// summary:
	//		open a basic notification
	API.getSettings().then((credentials) => {
		if (options.tooltip !== false) {
			chrome.browserAction.setTitle({
				title: message,
			});
		}
		setIcon(options.isError || false);

		if (credentials.notifyMe === false && options.force !== true) {
			return;
		}
		chrome.notifications.create(`notification${(new Date()).getTime()}`, {
			type: 'basic',
			iconUrl: '/img/icon.png',
			title,
			message,
		}, () => true);
	});
}
