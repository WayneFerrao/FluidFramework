/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * @fileoverview
 * Test data for property set template schema testing
 */

/**
 * @namespace property-changeset.Test
 * @alias badBothPropertiesAndTypeid.js
 * Namespace containing all schema-related data for property set validation
 */
export const templateSchema = {
	properties: [
		{
			id: "r",
			typeid: "Float32",
			properties: [{ typeid: "Int32", id: "ri" }],
		},
	],
	typeid: "TeamLeoValidation2:ColorID-1.0.0",
};
