/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

const { overrides } = require("nconf");

module.exports = {
	extends: [
		require.resolve("@fluidframework/eslint-config-fluid/minimal-deprecated"),
		"prettier",
	],
	rules: {
		"@typescript-eslint/strict-boolean-expressions": "off",
		// This package uses node's events APIs.
		// This should probably be reconsidered, but until then we will leave an exception for it here.
		"import/no-nodejs-modules": ["error", { allow: ["events"] }],
		"promise/catch-or-return": ["error", { allowFinally: true }],

		// TODO: enable strict null checks in tsconfig and remove this override
		"@typescript-eslint/prefer-nullish-coalescing": "off",
	},
	overrides: [
		{
			files: ["src/kafkaNodeConsumer.ts", "src/kafkaNodeProducer.ts"],
			rules: {
				"import/no-nodejs-modules": "off",
			},
		},
	],
};
