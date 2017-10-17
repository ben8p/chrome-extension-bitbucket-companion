import openSettingsView from './module/settings';
import CONSTANTS from './module/CONSTANTS';
import loading from './module/loading';
import API from './module/API';
import notify from './module/notification';
// summary:
//		long running script closure

let previousActiveIdList = [];

function openSettingsAfterIntall() {
	// summary:
	//		Check if the settings page should be open (after install)
	if (localStorage.getItem('installTime')) {
		return;
	}

	const now = (new Date()).getTime();
	localStorage.setItem('installTime', now);
	openSettingsView();
}

function fetchData() {
	// summary:
	//		fetch data and show a chrome notification
	chrome.storage.local.set({
		nextPollIn: CONSTANTS.POLL_EVERY,
	}, () => true);

	const notifyUser = (parsedData) => {
		if (previousActiveIdList.join() !== parsedData.activeIdList.join()) {
			previousActiveIdList = parsedData.activeIdList;
			if (parsedData.activeIdList.length > 0) {
				notify(chrome.i18n.getMessage('dontForget'), chrome.i18n.getMessage('reviewsToDo', parsedData.activeIdList.length.toString()));
			}
		}
		chrome.browserAction.setBadgeText({ text: (parsedData.activeIdList.length > 0 ? parsedData.activeIdList.length : '').toString() });
		chrome.storage.local.set({
			pullRequests: parsedData,
		}, () => true);
		loading.update(false);
	};

	API.getCredentials().then((credentials) => {
		if (!credentials.user || !credentials.password) { return; }
		loading.update(true);

		API.getPullRequests().then((parsedData) => {
			if ((parsedData.APPROVED || []).length > 0) {
				// check if any APPROVED needs to be unapproved
				const allGetPullRequestCommitsPromises = [];
				const lastReviewedCommits = [];
				parsedData.APPROVED.forEach((pullRequest) => {
					lastReviewedCommits.push(pullRequest.myLastReviewedCommit);
					allGetPullRequestCommitsPromises.push(API.getPullRequestCommits(pullRequest.from.projectKey, pullRequest.from.repositorySlug, pullRequest.id));
				});

				Promise.all(allGetPullRequestCommitsPromises).then((values) => {
					const changedPullRequests = [];
					values.forEach((value, index) => {
						const lastReviewedCommit = lastReviewedCommits[index];
						if (lastReviewedCommit === value.commitIds[0]) {
							return;
						}
						changedPullRequests.push(value);
					});
					if (changedPullRequests.length === 0) {
						// no changes in any PR we can update the badge and inform on the PR count
						notifyUser(parsedData);
						return;
					}
					notify(chrome.i18n.getMessage('haveChanged'), chrome.i18n.getMessage('prHaveChanged', changedPullRequests.length.toString()));

					const allRemoveApprovalPromises = [];
					changedPullRequests.forEach((pullRequest) => {
						allRemoveApprovalPromises.push(API.removeApproval(pullRequest.projectKey, pullRequest.repositorySlug, pullRequest.pullRequestId));
					});
					Promise.all(allRemoveApprovalPromises).then(() => {
						fetchData();
					});
				});
			} else {
				notifyUser(parsedData);
			}
		});
	});
}

function onAlarmFired() {
	chrome.storage.local.get({
		nextPollIn: 0,
	}, (items) => {
		if (items.nextPollIn <= 0) {
			chrome.storage.local.set({
				nextPollIn: CONSTANTS.POLL_EVERY,
			}, () => true);
		} else {
			chrome.storage.local.set({
				nextPollIn: --items.nextPollIn,
			}, () => true);
		}
	});
}

function onStorageChange(changes) {
	const needsRefresh = changes.bitbucketRestUrl || changes.user || changes.password || (changes.nextPollIn && changes.nextPollIn.newValue === 0);

	if (needsRefresh) {
		fetchData();
	}
}

function init() {
	// summary:
	//		Init the long running script

	openSettingsAfterIntall();
	chrome.storage.local.set({
		nextPollIn: 0,
	}, () => true);

	chrome.alarms.onAlarm.addListener(onAlarmFired);

	chrome.alarms.create('events', { delayInMinutes: 1, periodInMinutes: 1 });

	fetchData();

	chrome.storage.onChanged.addListener(onStorageChange);
}

init();
