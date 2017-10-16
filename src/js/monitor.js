import API from './module/API';
import on from './module/on';

const ACCEPTED_PAGE_END = ['overview', 'diff', 'commits'];
const PULL_REQUEST_PATH = '/pull-requests/';

API.getCredentials().then((credentials) => {
	if (!document.location.href.startsWith(credentials.restUrl) ||
		!document.location.href.indexOf(PULL_REQUEST_PATH) === -1 ||
		(!document.location.href.endsWith(ACCEPTED_PAGE_END[0]) &&
		!document.location.href.endsWith(ACCEPTED_PAGE_END[1]) &&
		!document.location.href.endsWith(ACCEPTED_PAGE_END[2]))) {
		return;
	}
	// records how many comments are on the PR at every visits of the PR
	API.getPullRequests().then((pullRequests) => {
		[].concat(pullRequests.OPEN || [], pullRequests.NEEDS_WORK || [], pullRequests.APPROVED || [], pullRequests.PENDING || [], pullRequests.MERGED || [], pullRequests.DECLINED || []).some((pullRequest) => {
			if (!document.location.href.startsWith(pullRequest.url)) {
				return false;
			}
			const data = {};
			data[pullRequest.url] = pullRequest.commentCount;
			chrome.storage.local.set(data, () => true);
			return true;
		});
	});

	on(window, 'unload', () => {
		chrome.storage.local.set({
			nextPollIn: 0,
		}, () => true);
	});
});
