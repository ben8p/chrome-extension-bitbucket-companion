// summary:
//		option page scripts
import i18n from './module/i18n';
import on from './module/on';
import '../css/options.css';

function saveOptions() {
	// summary:
	//		Saves options to chrome.storage
	let bitbucketRestUrl = document.getElementById('bitbucketRestUrlInput').value;
	const user = document.getElementById('bitbucketUserInput').value;
	const password = document.getElementById('bitbucketPasswordInput').value;
	const notifyMe = !document.getElementById('bitbucketNotification').checked;
	const disableStateOpen = !!document.getElementById('stateOpen').checked;
	const disableStateMerged = !!document.getElementById('stateMerged').checked;
	const disableStatePending = !!document.getElementById('statePending').checked;
	const disableStateDeclined = !!document.getElementById('stateDeclined').checked;
	const disableStateApproved = !!document.getElementById('stateApproved').checked;
	const disableStateNeedsWork = !!document.getElementById('stateNeedsWork').checked;
	// add leading slash
	bitbucketRestUrl += bitbucketRestUrl.substr(-1) !== '/' ? '/' : '';

	chrome.storage.sync.set({
		bitbucketRestUrl,
		user,
		password,
		notifyMe,
		disableStateOpen,
		disableStateMerged,
		disableStatePending,
		disableStateDeclined,
		disableStateApproved,
		disableStateNeedsWork,
	}, () => {
		// Update status to let user know options were saved.
		const status = document.getElementById('saveStatusMessage');
		status.textContent = chrome.i18n.getMessage('saved');
		setTimeout(() => {
			status.textContent = '';
		}, 1500);
	});
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function init() {
	i18n();
	document.getElementById('saveButton').addEventListener('click', saveOptions);
	chrome.storage.sync.get({
		bitbucketRestUrl: '',
		user: '',
		password: '',
		notifyMe: true,
		disableStateOpen: false,
		disableStateMerged: false,
		disableStatePending: false,
		disableStateDeclined: false,
		disableStateApproved: false,
		disableStateNeedsWork: false,
	}, (items) => {
		document.getElementById('bitbucketRestUrlInput').value = items.bitbucketRestUrl;
		document.getElementById('bitbucketUserInput').value = items.user;
		document.getElementById('bitbucketPasswordInput').value = items.password;
		document.getElementById('bitbucketNotification').checked = !items.notifyMe;

		document.getElementById('stateOpen').checked = items.disableStateOpen;
		document.getElementById('stateMerged').checked = items.disableStateMerged;
		document.getElementById('statePending').checked = items.disableStatePending;
		document.getElementById('stateDeclined').checked = items.disableStateDeclined;
		document.getElementById('stateApproved').checked = items.disableStateApproved;
		document.getElementById('stateNeedsWork').checked = items.disableStateNeedsWork;
	});
}

on(window, 'load', init);
