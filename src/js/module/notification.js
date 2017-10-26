// summary:
//		show notifications
import API from './API';

chrome.notifications.onClicked.addListener(() => {
	API.getCredentials().then((credentials) => {
		chrome.tabs.create({ url: credentials.restUrl });
	});
});

export default function (title, message) {
	// summary:
	//		open a basic notification
	API.getCredentials().then((credentials) => {
		if (credentials.notifyMe === false) {
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
