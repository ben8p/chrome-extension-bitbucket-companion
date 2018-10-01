import openSettingsView from './module/settings';
import CONSTANTS from './module/CONSTANTS';
import loading from './module/loading';
import API from './module/API';
import notify from './module/notification';
// summary:
//		long running script closure

let previousActiveIdList = [];
let lastErrorStatus = null;

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

function processError(status) {
	if (lastErrorStatus === status) {
		return;
	}
	lastErrorStatus = status;
	switch (status) {
	default:
		notify(chrome.i18n.getMessage('unknownXHRError'), chrome.i18n.getMessage('unknownXHRErrorDetails'), {
			isError: true,
		});
		break;
	case -1:
		// could not reach the server
		notify(chrome.i18n.getMessage('serverError'), chrome.i18n.getMessage('updateServerUrl'), {
			isError: true,
		});
		break;
	case 401:
		// authorisation issue
		notify(chrome.i18n.getMessage('unauthorized'), chrome.i18n.getMessage('updateCredentials'), {
			isError: true,
			force: true,
		});
		break;
	}
}


function fetchData() {
	// summary:
	//		fetch data and show a chrome notification
	chrome.storage.local.set({
		nextPollIn: CONSTANTS.POLL_EVERY,
	}, () => true);

	const notifyUser = (parsedData) => {
		const count = parsedData.activeIdList.length.toString();
		if (previousActiveIdList.join() !== parsedData.activeIdList.join()) {
			previousActiveIdList = parsedData.activeIdList;
			if (parsedData.activeIdList.length > 0) {
				notify(chrome.i18n.getMessage('dontForget'), chrome.i18n.getMessage('reviewsToDo', count), {
					badge: count,
				});
			}
		}
		notify(null, null, {
			badge: +count > 0 ? count : '',
		});

		chrome.storage.local.set({
			pullRequests: parsedData,
		}, () => true);
		loading.update(false);
	};

	API.getSettings().then((credentials) => {
		if (!credentials.user || !credentials.password) { return; }
		loading.update(true);

		API.getPullRequests().then((parsedData) => {
			const allCanBeMergedPromises = [];
			if ((parsedData.PENDING || []).length > 0) {
				// check if pending pr can be merged
				parsedData.PENDING.forEach((pullRequest) => {
					allCanBeMergedPromises.push(API.canBeMerged(pullRequest.from.projectKey, pullRequest.from.repositorySlug, pullRequest.id));
				});
			}
			Promise.all(allCanBeMergedPromises).then((results) => {
				(parsedData.PENDING || []).forEach((pullRequest) => {
					(results || []).forEach((result) => {
						if (pullRequest.from.projectKey === result.projectKey && pullRequest.from.repositorySlug === result.repositorySlug && pullRequest.id === result.pullRequestId) {
							pullRequest.canMerge = result.canMerge;
							pullRequest.conflicted = result.conflicted;
						}
					});
				});

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
						if (credentials.autoRemoveApproval) {
							notify(chrome.i18n.getMessage('haveChanged'), chrome.i18n.getMessage('prHaveChanged', changedPullRequests.length.toString()), {
								tooltip: false,
							});
							const allRemoveApprovalPromises = [];
							changedPullRequests.forEach((pullRequest) => {
								allRemoveApprovalPromises.push(API.removeApproval(pullRequest.projectKey, pullRequest.repositorySlug, pullRequest.pullRequestId));
							});
							Promise.all(allRemoveApprovalPromises).then(() => {
								fetchData();
							}).catch((status) => {
								processError(status);
							});
						}
					}).catch((status) => {
						processError(status);
						loading.update(false);
					});
				} else {
					notifyUser(parsedData);
				}
			}).catch((status) => {
				processError(status);
				loading.update(false);
			});
		}).catch((status) => {
			processError(status);
			loading.update(false);
		});
	}).catch((status) => {
		processError(status);
		loading.update(false);
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

function isBitbucketServer(url, sendResponse) {
	API.getSettings().then((credentials) => {
		if (!url.startsWith(credentials.restUrl)) {
			sendResponse(false);
			return;
		}
		sendResponse(true);
	});
}

function refresh(url) {
	// records how many comments are on the PR at every visits of the PR
	API.getPullRequests().then((pullRequests) => {
		[].concat(pullRequests.OPEN || [], pullRequests.NEEDS_WORK || [], pullRequests.APPROVED || [], pullRequests.PENDING || [], pullRequests.MERGED || [], pullRequests.DECLINED || []).some((pullRequest) => {
			if (!url.startsWith(pullRequest.url)) {
				return false;
			}
			const data = {};
			data[pullRequest.url] = pullRequest.commentCount;
			chrome.storage.local.set(data, () => true);
			return true;
		});

		chrome.storage.local.set({
			nextPollIn: 0,
		}, () => true);
	});
}

function onMessage(request, sender, sendResponse) {
	if (request.isBitbucketServer) {
		isBitbucketServer(request.isBitbucketServer, sendResponse);
		return true;
	}
	if (request.refresh) {
		refresh(request.refresh);
	}
	return false;
}

function init() {
	// summary:
	//		Init the long running script

	openSettingsAfterIntall();
	chrome.storage.local.set({
		nextPollIn: 0,
	}, () => true);

	chrome.runtime.onMessage.addListener(onMessage);

	chrome.alarms.onAlarm.addListener(onAlarmFired);

	chrome.alarms.create('events', { delayInMinutes: 1, periodInMinutes: 1 });

	fetchData();

	chrome.storage.onChanged.addListener(onStorageChange);
}

init();
