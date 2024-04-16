/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/*
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 * Generated by fluid-type-test-generator in @fluidframework/build-tools.
 */

import type * as old from "@fluidframework/odsp-urlresolver-previous";
import type * as current from "../../index.js";


// See 'build-tools/src/type-test-generator/compatibility.ts' for more information.
type TypeOnly<T> = T extends number
	? number
	: T extends string
	? string
	: T extends boolean | bigint | symbol
	? T
	: {
			[P in keyof T]: TypeOnly<T[P]>;
	  };

/*
* Validate forward compat by using old type in place of current type
* If breaking change required, add in package.json under typeValidation.broken:
* "ClassDeclaration_OdspUrlResolver": {"forwardCompat": false}
*/
declare function get_old_ClassDeclaration_OdspUrlResolver():
    TypeOnly<old.OdspUrlResolver>;
declare function use_current_ClassDeclaration_OdspUrlResolver(
    use: TypeOnly<current.OdspUrlResolver>): void;
use_current_ClassDeclaration_OdspUrlResolver(
    get_old_ClassDeclaration_OdspUrlResolver());

/*
* Validate back compat by using current type in place of old type
* If breaking change required, add in package.json under typeValidation.broken:
* "ClassDeclaration_OdspUrlResolver": {"backCompat": false}
*/
declare function get_current_ClassDeclaration_OdspUrlResolver():
    TypeOnly<current.OdspUrlResolver>;
declare function use_old_ClassDeclaration_OdspUrlResolver(
    use: TypeOnly<old.OdspUrlResolver>): void;
use_old_ClassDeclaration_OdspUrlResolver(
    get_current_ClassDeclaration_OdspUrlResolver());

/*
* Validate forward compat by using old type in place of current type
* If breaking change required, add in package.json under typeValidation.broken:
* "RemovedVariableDeclaration_isOdspUrl": {"forwardCompat": false}
*/

/*
* Validate back compat by using current type in place of old type
* If breaking change required, add in package.json under typeValidation.broken:
* "RemovedVariableDeclaration_isOdspUrl": {"backCompat": false}
*/
