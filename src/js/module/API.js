// summary:
//		API closure
// https://developer.atlassian.com/static/rest/bitbucket-server/5.4.1/bitbucket-rest.html#idm139808105701392
// https://git.mybitbucketserver.com/rest/api/1.0/inbox/pull-requests

function getCredentials() {
	// summary:
	//		retrieve credentials stored in chrome storage
	return new Promise(((resolve, reject) => {
		chrome.storage.sync.get({
			bitbucketRestUrl: '',
			user: '',
			password: '',
		}, (items) => {
			if (!items.bitbucketRestUrl || !items.user || !items.password) {
				reject();
			} else {
				resolve({
					user: items.user,
					password: items.password,
					restUrl: items.bitbucketRestUrl,
				});
			}
		});
	}));
}

function xhr(url, method, body) {
	// summary:
	//		perform a request to the api
	method = method || 'GET';
	return new Promise(((resolve, reject) => {
		getCredentials().then((credentials) => {
			const xhrObject = new XMLHttpRequest();

			xhrObject.addEventListener('load', (response) => {
				if (response.target.status === 404 || response.target.status === 401) {
					reject();
				} else {
					resolve(JSON.parse(response.target.response));
				}
			}, false);
			xhrObject.addEventListener('error', reject, false);

			xhrObject.open(method, credentials.restUrl + url);
			const b64 = window.btoa(`${credentials.user}:${credentials.password}`);
			xhrObject.setRequestHeader('Authorization', `Basic ${b64}`);

			xhrObject.send(body || null);
		}, reject);
	}));
}

export default {
	removeApproval(projectKey, repositorySlug, pullRequestId) {
		const url = `rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/approve`;
		return new Promise(((resolve, reject) => {
			xhr(url, 'DELETE').then((data) => {
				resolve({
					approved: data.approved,
				});
			}, reject);
		}));
	},
	getPullRequestCommits(projectKey, repositorySlug, pullRequestId) {
		const url = `rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/commits`;
		return new Promise(((resolve, reject) => {
			xhr(url).then((data) => {
				const parsedData = {
					projectKey,
					repositorySlug,
					pullRequestId,
					commitIds: [],
				};
				data.values.forEach((value) => {
					parsedData.commitIds.push(value.id);
				});
				resolve(parsedData);
			}, reject);
		}));
	},
	getPullRequestChanges(projectKey, repositorySlug, pullRequestId, sinceCommitTag) {
		// only bitbucket 5+
		const url = `rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/changes?sinceid=${sinceCommitTag}`;
		return new Promise(((resolve, reject) => {
			xhr(url).then((data) => {
				resolve({
					projectKey,
					repositorySlug,
					pullRequestId,
					sinceCommitTag,
					hasChanged: data.size > 0,
				});
			}, reject);
		}));
	},
	getPullRequests() {
		// summary:
		//		get all reviews a user has to do
		return new Promise(((resolve, reject) => {
			getCredentials().then((credentials) => {
				const url = 'rest/api/1.0/dashboard/pull-requests';
				xhr(url).then((data) => {
					const parsedData = {
						activeIdList: [],
						inactiveIdList: [],
						all: [],
					};
					data.values.forEach((value) => {
						let lastReviewedCommit = '';
						value.reviewers.some((reviewer) => {
							if (reviewer.user.name === credentials.user && reviewer.lastReviewedCommit) {
								lastReviewedCommit = reviewer.lastReviewedCommit;
								return true;
							}
							return false;
						});

						let newState = value.state;
						const prData = {
							id: value.id || '',
							title: value.title || '',
							description: value.description || '',
							url: value.links.self[0].href || '',
							mergeInto: {
								repository: value.toRef.repository.name || '',
								branch: value.toRef.displayId || '',
							},
							from: {
								projectKey: value.toRef.repository.project.key || '',
								repositorySlug: value.toRef.repository.slug || '',
							},
							author: value.author.user.displayName || '',
							authorId: value.author.user.name || '',
							isMine: value.author.user.name === credentials.user,
							myLastReviewedCommit: lastReviewedCommit,
							reviewers: value.reviewers.map((reviewer) => {
								if (reviewer.user.name === credentials.user && value.state === 'OPEN') {
									if (reviewer.status === 'NEEDS_WORK') {
										newState = 'NEEDS_WORK';
									} else if (reviewer.status === 'APPROVED') {
										newState = 'APPROVED';
									}
								}
								return {
									displayName: reviewer.user.displayName || '',
									needsWork: reviewer.status === 'NEEDS_WORK',
									approved: reviewer.approved || '',
								};
							}),
							commentCount: +(value.properties.commentCount || 0),
							openTaskCount: +(value.properties.openTaskCount || 0),
						};
						if (prData.isMine && prData.state === 'OPEN') {
							newState = 'PENDING';
						}
						prData.state = newState;
						if (prData.state === 'OPEN') {
							parsedData.activeIdList.push(value.id);
						} else {
							parsedData.inactiveIdList.push(value.id);
						}
						(parsedData[prData.state] = parsedData[prData.state] || []).push(prData);
						parsedData.all.push(prData);
					});

					resolve(parsedData);
				}, reject);
			}, reject);
		}));
	},
	getCredentials,
};
