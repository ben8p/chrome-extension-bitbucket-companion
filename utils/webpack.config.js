const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');

const fileExtensions = ['jpg', 'jpeg', 'png', 'gif', 'eot', 'otf', 'svg', 'ttf', 'woff', 'woff2'];

function getOptions() {
	return {
		entry: {
			popup: path.join(__dirname, '..', 'src', 'js', 'popup.js'),
			options: path.join(__dirname, '..', 'src', 'js', 'options.js'),
			events: path.join(__dirname, '..', 'src', 'js', 'events.js'),
			monitor: path.join(__dirname, '..', 'src', 'js', 'monitor.js'),
		},
		output: {
			path: path.join(__dirname, '..', 'build', 'js'),
			filename: '[name].js',
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					loader: 'style-loader!css-loader',
					exclude: /node_modules/,
				},
				{
					test: new RegExp(`.(${fileExtensions.join('|')})$`),
					loader: 'file-loader?name=[name].[ext]',
					exclude: /node_modules/,
				},
				{
					test: /\.html$/,
					loader: 'html-loader',
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			alias: {},
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: path.join(__dirname, '..', 'src', 'popup.html'),
				filename: path.join('..', 'popup.html'),
				chunks: ['popup'],
			}),
			new HtmlWebpackPlugin({
				template: path.join(__dirname, '..', 'src', 'options.html'),
				filename: path.join('..', 'options.html'),
				chunks: ['options'],
			}),
			new WriteFilePlugin(),
		],
	};
}

module.exports = getOptions;
