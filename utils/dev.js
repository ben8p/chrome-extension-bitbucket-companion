const watch = require('node-watch');
const path = require('path');
const build = require('./build');

watch(path.join(__dirname, '..', 'src'), { recursive: true }, () => {
	build();
});
