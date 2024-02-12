/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { readJsonSync } from "fs-extra";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { typeOnly } from "./compatibility";
import {
	ensureDevDependencyExists,
	getPreviousPackageJsonPath,
	getTypeRollupPathFromExtractorConfig,
	getTypeDefinitionFilePath,
	typeDataFromFile,
	generateCompatibilityTestCases,
	prepareFilepathForTests,
	initializeProjectsAndLoadFiles,
} from "./typeTestUtils";
import { PackageJson } from "../common/npmPackage";

// Do not check that file exists before opening:
// Doing so is a time of use vs time of check issue so opening the file could fail anyway.
// Do not catch error from opening file since the default behavior is fine (exits process with error showing useful message)
const packageObject: PackageJson = readJsonSync("package.json");
const previousPackageName = `${packageObject.name}-previous`;
const previousBasePath = path.join("node_modules", previousPackageName);

ensureDevDependencyExists(packageObject, previousPackageName);
getPreviousPackageJsonPath(previousBasePath);

const filePath = prepareFilepathForTests(packageObject);
if (packageObject.typeValidation?.disabled) {
	console.log("skipping type test generation because they are disabled in package.json");
	// force means to ignore the error if the file does not exist.
	rmSync(filePath, { force: true });
	process.exit(0);
}
const typeRollupPaths = getTypeRollupPathFromExtractorConfig("alpha", previousBasePath);

let typeDefinitionFilePath: string;

// Check if a specified typeRollupFile exists
if (typeRollupPaths) {
	typeDefinitionFilePath = typeRollupPaths;
} else {
	typeDefinitionFilePath = getTypeDefinitionFilePath(previousBasePath);
}

const { currentFile, previousFile } = initializeProjectsAndLoadFiles(
	typeDefinitionFilePath,
	previousBasePath,
	previousPackageName,
);
const currentTypeMap = typeDataFromFile(currentFile);
const previousData = [...typeDataFromFile(previousFile).values()];

function compareString(a: string, b: string): number {
	return a > b ? 1 : a < b ? -1 : 0;
}

previousData.sort((a, b) => compareString(a.name, b.name));

const testString: string[] = [
	`/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 * Generated by fluid-type-test-generator in @fluidframework/build-tools.
 */
import type * as old from "${previousPackageName}";
import type * as current from "../../index";
`,
	typeOnly,
];

const testCases = generateCompatibilityTestCases(
	previousData,
	currentTypeMap,
	packageObject,
	testString,
);

mkdirSync("./src/test/types", { recursive: true });

writeFileSync(filePath, testCases.join("\n"));
console.log(`generated ${path.resolve(filePath)}`);
