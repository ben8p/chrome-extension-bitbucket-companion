// summary:
//		settings helper closure
export default function () {
	// summary:
	//		open settings screen
	chrome.tabs.create({
		url: `chrome://extensions/?options=${chrome.runtime.id}`,
	});
}
