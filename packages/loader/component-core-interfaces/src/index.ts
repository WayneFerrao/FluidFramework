/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// keep the old types for back-compat
// for those that need to support both
export { IComponent } from "./legacy/components";
export * from "./legacy";

// when merging declarations the module path must match exactly. Because of this we need to explicitly export
// IFluidObject as opposed to an export *
export { IFluidObject } from "./fluidObject";

export * from "./fluidLoadable";
export * from "./fluidRouter";
export * from "./handles";
export * from "./serializer";
