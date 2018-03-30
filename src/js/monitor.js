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
	if (document.location.pathname.includes('/pull-requests')) {
		on(window, 'unload', refresh);
		refresh();
	}

	if (document.location.pathname.endsWith('/branches')) {
		document.querySelectorAll('#branch-list thead th').forEach((th, thIndex) => {
			th.dataset.order = '0';
			th.style.cursor = 'pointer';

			th.addEventListener('click', () => {
				th.dataset.order = th.dataset.order === '0' ? '1' : '0';

				[...document.querySelectorAll('#branch-list tbody tr')].sort((a, b) => {
					const aNode = (th.dataset.order === '0' ? a : b).querySelectorAll('td')[thIndex];
					const bNode = (th.dataset.order === '0' ? b : a).querySelectorAll('td')[thIndex];

					const aValue = (aNode.querySelector('[title]') || { title: aNode.innerHTML }).title.toUpperCase();
					const bValue = (bNode.querySelector('[title]') || { title: bNode.innerHTML }).title.toUpperCase();
					if (aValue < bValue) {
						return -1;
					}
					if (aValue > bValue) {
						return 1;
					}
					// a must be equal to b
					return 0;
				}).forEach((tr) => {
					document.querySelector('#branch-list tbody').appendChild(tr);
				});
			});
		});
	}
});
