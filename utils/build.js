const webpack = require('webpack');
const config = require('./webpack.config');

const fileSystem = require('fs-extra');
const path = require('path');
const fs = require('fs');

const archiver = require('archiver');

function build() {
	let contents = fs.readFileSync(path.join(__dirname, '..', 'build', 'manifest.json'), 'utf8');
	const manifest = JSON.parse(contents);
	contents = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8');
	const packageJson = JSON.parse(contents);

	// clean de dist folder
	fileSystem.emptyDirSync(path.join(__dirname, '..', 'build'));

	// generates the manifest file using the package.json informations
	manifest.description = packageJson.description;
	manifest.name = packageJson.name;
	manifest.version = packageJson.version;

	fileSystem.writeFileSync(
		path.join(__dirname, '..', 'build', 'manifest.json'),
		JSON.stringify(manifest),
	);

	fileSystem.copySync(path.join(__dirname, '..', 'src', 'img'), path.join(__dirname, '..', 'build', 'img'));
	fileSystem.copySync(path.join(__dirname, '..', 'src', '_locales'), path.join(__dirname, '..', 'build', '_locales'));

	webpack(
		config(),
		(err) => {
			if (err) {
				throw err;
			}

			// create the release file
			const output = fs.createWriteStream(path.join(__dirname, '..', 'build', 'release.zip'));
			const archive = archiver('zip', {
				zlib: {
					level: 9,
				},
			});
			archive.pipe(output);
			archive.glob('**/*', {
				cwd: path.join(__dirname, '..', 'build'),
				ignore: 'release.zip',
			});
			archive.finalize();
		},
	);
}

module.exports = build;
build();
