// summary:
//		popup page scripts
import i18n from './module/i18n';
import API from './module/API';
import dom from './module/dom';
import openSettings from './module/settings';
import loading from './module/loading';
import CONSTANTS from './module/CONSTANTS';
import on from './module/on';
import { markdown } from '../../node_modules/markdown';
import '../css/popup.css';

const NONE_ROW = '<p>__MSG_none__</p>';
let credentials;

function showLoading() {
	loading.isLoading().then((state) => {
		dom.hide(document.getElementById('progressMessage'), !state);
	});
}

function updateRefreshMessage() {
	chrome.storage.local.get({
		nextPollIn: 0,
	}, (items) => {
		const minutes = items.nextPollIn.toString();
		document.getElementById('nextRefreshMessage').innerHTML = chrome.i18n.getMessage('nextRefresh', minutes);
	});
}

function getTemplate(pullRequest, commentsPerUrlList) {
	const commentDiff = (pullRequest.commentCount || 0) - (commentsPerUrlList[pullRequest.url] || 0);
	const hasCommentDiffClass = commentDiff ? 'hasCommentDiff' : '';
	return `<div class="pullrequest ${pullRequest.state}">
		<h2><span class="state">${pullRequest.state}</span><a href="${pullRequest.url}">${pullRequest.title}</a></h2>
		<div class="content">
		<p><span class="repository">${pullRequest.mergeInto.repository} &gt; ${pullRequest.mergeInto.branch}</span><span class="author"><img src="${credentials.restUrl}/users/${pullRequest.authorId}/avatar.png?s=32" />${pullRequest.isMine ? chrome.i18n.getMessage('me') : pullRequest.author}</span></p>
		<p><span class="comments ${hasCommentDiffClass}">${pullRequest.commentCount} ${chrome.i18n.getMessage('comments')}</span><span class="tasks">${pullRequest.openTaskCount} ${chrome.i18n.getMessage('openTasks')}</span></p>
		<p><span class="comments">${commentDiff} ${chrome.i18n.getMessage('sinceRecord')}</span></p>
		<p>${markdown.toHTML(pullRequest.description)}</p>
		</div>
	</div>`;
}

function listPullRequests() {
	chrome.storage.local.get({
		pullRequests: {},
	}, (items) => {
		// after getting all data we inject some stored values
		const urlList = {};
		items.pullRequests.all.forEach((pullRequest) => {
			urlList[pullRequest.url] = 0;
		});

		chrome.storage.local.get(urlList, (values) => {
			const tbody = [];
			[].concat(items.pullRequests.OPEN || [], items.pullRequests.NEEDS_WORK || [], items.pullRequests.APPROVED || [], items.pullRequests.PENDING || [], items.pullRequests.MERGED || [], items.pullRequests.DECLINED || []).forEach((pullRequest) => {
				tbody.push(getTemplate(pullRequest, values));
			});
			document.getElementById('reviewsList').innerHTML = tbody.length ? tbody.join('') : NONE_ROW;

			loading.update(false);
		});
	});
}


function onStorageChange(changes) {
	const keys = Object.keys(changes);
	if (keys.indexOf('nextPollIn') !== -1) {
		const storageChange = changes.nextPollIn;
		if (storageChange.newValue === 0) {
			loading.update(true);
		} else if (storageChange.newValue === CONSTANTS.POLL_EVERY) {
			loading.update(false);
		}
		updateRefreshMessage();
	}
	if (keys.indexOf('loading') !== -1) {
		showLoading();
	}
	if (keys.indexOf('pullRequests') !== -1) {
		listPullRequests();
	}
}

function connectClickEvent() {
	on(document.getElementById('contentWrapper'), 'click', (event) => {
		if (event.target.tagName.toLowerCase() === 'a') {
			const url = event.target.getAttribute('href');
			window.open(url);
		}
	});
}

function init() {
	i18n();
	API.getCredentials().then((newCredentials) => {
		credentials = newCredentials;
		chrome.storage.onChanged.addListener(onStorageChange);

		on(document.getElementById('refreshButton'), 'click', () => {
			chrome.storage.local.set({
				nextPollIn: 0,
			}, () => true);
		});

		showLoading();
		updateRefreshMessage();
		listPullRequests();

		connectClickEvent();
	}, openSettings);
}

on(window, 'load', init);
