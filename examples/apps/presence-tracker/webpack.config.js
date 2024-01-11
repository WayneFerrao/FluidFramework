/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const { merge } = require("webpack-merge");
const webpack = require("webpack");

module.exports = (env) => {
	const isProduction = env?.production;

	return merge(
		{
			entry: {
				app: "./src/app.ts",
			},
			resolve: {
				extensionAlias: {
					".js": [".ts", ".tsx", ".js"],
				},
				extensions: [".ts", ".tsx", ".js"],
			},
			module: {
				rules: [
					{
						test: /\.tsx?$/,
						loader: "ts-loader",
					},
				],
			},
			output: {
				filename: "[name].bundle.js",
				path: path.resolve(__dirname, "dist"),
				library: "[name]",
				// https://github.com/webpack/webpack/issues/5767
				// https://github.com/webpack/webpack/issues/7939
				devtoolNamespace: "fluid-example/presence-tracker",
				libraryTarget: "umd",
			},
			plugins: [
				new HtmlWebpackPlugin({
					template: "./src/index.html",
				}),
				new webpack.ProvidePlugin({
					process: "process/browser",
				}),
			],
		},
		isProduction ? require("./webpack.prod") : require("./webpack.dev"),
	);
};
