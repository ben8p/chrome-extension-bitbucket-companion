const webpack = require('webpack');
const config = require('./webpack.config');

const fileSystem = require('fs-extra');
const path = require('path');


function build() {
	const manifest = require('../src/manifest.json'); // eslint-disable-line global-require

	// clean de dist folder
	fileSystem.emptyDirSync(path.join(__dirname, '..', 'build'));

	// generates the manifest file using the package.json informations
	manifest.description = process.env.npm_package_description;
	manifest.name = process.env.npm_package_name;
	manifest.version = process.env.npm_package_version;

	fileSystem.writeFileSync(
		path.join(__dirname, '../build/manifest.json'),
		JSON.stringify(manifest),
	);

	fileSystem.copySync(path.join(__dirname, '..', 'src', 'img'), path.join(__dirname, '..', 'build', 'img'));
	fileSystem.copySync(path.join(__dirname, '..', 'src', '_locales'), path.join(__dirname, '..', 'build', '_locales'));

	webpack(
		config(),
		(err) => { if (err) throw err; },
	);
}

module.exports = build;
build();
