/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/*
 * THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
 * Generated by flub generate:typetests in @fluid-tools/build-cli.
 */

import type * as old from "@fluidframework/task-manager-previous/internal";

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
 * Validate forward compatibility by using the old type in place of the current type.
 * If this test starts failing, it indicates a change that is not forward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "InterfaceDeclaration_ITaskManager": {"forwardCompat": false}
 */
declare function get_old_InterfaceDeclaration_ITaskManager():
    TypeOnly<old.ITaskManager>;
declare function use_current_InterfaceDeclaration_ITaskManager(
    use: TypeOnly<current.ITaskManager>): void;
use_current_InterfaceDeclaration_ITaskManager(
    // @ts-expect-error compatibility expected to be broken
    get_old_InterfaceDeclaration_ITaskManager());

/*
 * Validate backward compatibility by using the current type in place of the old type.
 * If this test starts failing, it indicates a change that is not backward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "InterfaceDeclaration_ITaskManager": {"backCompat": false}
 */
declare function get_current_InterfaceDeclaration_ITaskManager():
    TypeOnly<current.ITaskManager>;
declare function use_old_InterfaceDeclaration_ITaskManager(
    use: TypeOnly<old.ITaskManager>): void;
use_old_InterfaceDeclaration_ITaskManager(
    // @ts-expect-error compatibility expected to be broken
    get_current_InterfaceDeclaration_ITaskManager());

/*
 * Validate forward compatibility by using the old type in place of the current type.
 * If this test starts failing, it indicates a change that is not forward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "InterfaceDeclaration_ITaskManagerEvents": {"forwardCompat": false}
 */
declare function get_old_InterfaceDeclaration_ITaskManagerEvents():
    TypeOnly<old.ITaskManagerEvents>;
declare function use_current_InterfaceDeclaration_ITaskManagerEvents(
    use: TypeOnly<current.ITaskManagerEvents>): void;
use_current_InterfaceDeclaration_ITaskManagerEvents(
    get_old_InterfaceDeclaration_ITaskManagerEvents());

/*
 * Validate backward compatibility by using the current type in place of the old type.
 * If this test starts failing, it indicates a change that is not backward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "InterfaceDeclaration_ITaskManagerEvents": {"backCompat": false}
 */
declare function get_current_InterfaceDeclaration_ITaskManagerEvents():
    TypeOnly<current.ITaskManagerEvents>;
declare function use_old_InterfaceDeclaration_ITaskManagerEvents(
    use: TypeOnly<old.ITaskManagerEvents>): void;
use_old_InterfaceDeclaration_ITaskManagerEvents(
    get_current_InterfaceDeclaration_ITaskManagerEvents());

/*
 * Validate forward compatibility by using the old type in place of the current type.
 * If this test starts failing, it indicates a change that is not forward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "TypeAliasDeclaration_TaskEventListener": {"forwardCompat": false}
 */
declare function get_old_TypeAliasDeclaration_TaskEventListener():
    TypeOnly<old.TaskEventListener>;
declare function use_current_TypeAliasDeclaration_TaskEventListener(
    use: TypeOnly<current.TaskEventListener>): void;
use_current_TypeAliasDeclaration_TaskEventListener(
    get_old_TypeAliasDeclaration_TaskEventListener());

/*
 * Validate backward compatibility by using the current type in place of the old type.
 * If this test starts failing, it indicates a change that is not backward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "TypeAliasDeclaration_TaskEventListener": {"backCompat": false}
 */
declare function get_current_TypeAliasDeclaration_TaskEventListener():
    TypeOnly<current.TaskEventListener>;
declare function use_old_TypeAliasDeclaration_TaskEventListener(
    use: TypeOnly<old.TaskEventListener>): void;
use_old_TypeAliasDeclaration_TaskEventListener(
    get_current_TypeAliasDeclaration_TaskEventListener());

/*
 * Validate forward compatibility by using the old type in place of the current type.
 * If this test starts failing, it indicates a change that is not forward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "ClassDeclaration_TaskManager": {"forwardCompat": false}
 */
declare function get_old_ClassDeclaration_TaskManager():
    TypeOnly<old.TaskManager>;
declare function use_current_ClassDeclaration_TaskManager(
    use: TypeOnly<current.TaskManager>): void;
use_current_ClassDeclaration_TaskManager(
    // @ts-expect-error compatibility expected to be broken
    get_old_ClassDeclaration_TaskManager());

/*
 * Validate backward compatibility by using the current type in place of the old type.
 * If this test starts failing, it indicates a change that is not backward compatible.
 * To acknowledge the breaking change, add the following to package.json under
 * typeValidation.broken:
 * "ClassDeclaration_TaskManager": {"backCompat": false}
 */
declare function get_current_ClassDeclaration_TaskManager():
    TypeOnly<current.TaskManager>;
declare function use_old_ClassDeclaration_TaskManager(
    use: TypeOnly<old.TaskManager>): void;
use_old_ClassDeclaration_TaskManager(
    get_current_ClassDeclaration_TaskManager());
