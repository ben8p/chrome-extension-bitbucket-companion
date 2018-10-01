// summary:
//		popup page scripts
import i18n from './module/i18n';
import API from './module/API';
import dom from './module/dom';
import openSettings from './module/settings';
import loading from './module/loading';
import on from './module/on';
import { markdown } from '../../node_modules/markdown';
import '../css/popup.css';

const NONE_ROW = `<p>${chrome.i18n.getMessage('none')}</p>`;
let settings;

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
	const showThumbUp = pullRequest.canMerge === true ? '' : 'hidden';
	const showThumbDown = pullRequest.canMerge === false ? '' : 'hidden';
	const thumbDownDetails = pullRequest.conflicted ? chrome.i18n.getMessage('conflicted') : chrome.i18n.getMessage('approvalmissing');
	return `<div class="pullrequest ${pullRequest.state}">
		<h2>
			<a name="${pullRequest.state}" />
			<span class="state">${pullRequest.state}</span>
			<span class="thumb ${showThumbUp}">&#x1f44d;</span>
			<span class="thumb ${showThumbDown}" title="${thumbDownDetails}" alt="${thumbDownDetails}">&#x1f44e;</span>
			<a href="${pullRequest.url}">${pullRequest.title}</a>
		</h2>
		<div class="content">
		<p><span class="repository">${pullRequest.mergeInto.repository} &gt; ${pullRequest.mergeInto.branch}</span><span class="author"><img src="${settings.restUrl}/users/${pullRequest.authorId}/avatar.png?s=32" />${pullRequest.isMine ? chrome.i18n.getMessage('me') : pullRequest.author}</span></p>
		<p><span class="comments ${hasCommentDiffClass}">${pullRequest.commentCount} ${chrome.i18n.getMessage('comments')}</span><span class="tasks">${pullRequest.openTaskCount} ${chrome.i18n.getMessage('openTasks')}</span></p>
		<p><span class="comments">${commentDiff} ${chrome.i18n.getMessage('sinceRecord')}</span></p>
		<p>${markdown.toHTML(pullRequest.description)}</p>
		</div>
	</div>`;
}

function getShortcutTemplate(pullRequest, count) {
	return `<a href=#${pullRequest.state}><span class="pullrequestState ${pullRequest.state}">${pullRequest.state} - ${count}</span></a>`;
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
			const shortcuts = [];
			const list = [];
			let previousState = '';

			if (items.pullRequests.OPEN && !settings.disableStateOpen) {
				list.push(...items.pullRequests.OPEN);
			}
			if (items.pullRequests.NEEDS_WORK && !settings.disableStateNeedsWork) {
				list.push(...items.pullRequests.NEEDS_WORK);
			}
			if (items.pullRequests.APPROVED && !settings.disableStateApproved) {
				list.push(...items.pullRequests.APPROVED);
			}
			if (items.pullRequests.PENDING && !settings.disableStatePending) {
				list.push(...items.pullRequests.PENDING);
			}
			if (items.pullRequests.MERGED && !settings.disableStateMerged) {
				list.push(...items.pullRequests.MERGED);
			}
			if (items.pullRequests.DECLINED && !settings.disableStateDeclined) {
				list.push(...items.pullRequests.DECLINED);
			}

			list.forEach((pullRequest) => {
				tbody.push(getTemplate(pullRequest, values));
				if (previousState !== pullRequest.state) {
					previousState = pullRequest.state;
					shortcuts.push(getShortcutTemplate(pullRequest, items.pullRequests[pullRequest.state].length));
				}
			});
			document.getElementById('reviewsList').innerHTML = tbody.length ? tbody.join('') : NONE_ROW;
			document.getElementById('shortcuts').innerHTML = shortcuts.length ? shortcuts.join('') : '';
		});
	});
}

function toggleUI() {
	chrome.storage.local.get({
		inErrorState: false,
	}, (items) => {
		document.getElementById('contentWrapper').classList.toggle('hidden', items.inErrorState);
		document.getElementById('errorMessage').classList.toggle('hidden', !items.inErrorState);
	});
}

function onStorageChange(changes) {
	if (changes.nextPollIn !== undefined) {
		updateRefreshMessage();
		showLoading();
	}
	if (changes.loading !== undefined) {
		showLoading();
	}
	if (changes.pullRequests !== undefined) {
		listPullRequests();
	}
	if (changes.inErrorState !== undefined) {
		toggleUI();
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
	API.getSettings().then((newSettings) => {
		settings = newSettings;
		chrome.storage.onChanged.addListener(onStorageChange);
		on(document.getElementById('refreshButton'), 'click', () => {
			chrome.storage.local.set({
				nextPollIn: 0,
			}, () => true);
		});
		on(document.getElementById('forceRefreshButton'), 'click', () => {
			chrome.storage.local.set({
				inErrorState: false,
				nextPollIn: 0,
			}, () => true);
		});
		on(document.getElementById('forceSettings'), 'click', () => {
			openSettings();
		});

		toggleUI();
		showLoading();
		updateRefreshMessage();
		listPullRequests();

		connectClickEvent();
	}, openSettings);
}

on(window, 'load', init);
