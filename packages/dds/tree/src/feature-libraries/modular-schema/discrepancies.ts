/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { assert } from "@fluidframework/core-utils/internal";

import {
	type FieldKey,
	type FieldKindIdentifier,
	LeafNodeStoredSchema,
	MapNodeStoredSchema,
	ObjectNodeStoredSchema,
	type TreeFieldStoredSchema,
	type TreeNodeSchemaIdentifier,
	type TreeStoredSchema,
	type TreeTypeSet,
	type ValueSchema,
} from "../../core/index.js";

/**
 * @remarks
 *
 * 1. FieldIncompatibility
 *
 * `FieldIncompatibility` represents the differences between two `TreeFieldStoredSchema` objects. It consists of
 * three types of incompatibilities:
 *
 * - FieldKindIncompatibility: Indicates the differences in `FieldKindIdentifier` between two `TreeFieldStoredSchema`
 * objects (e.g., optional, required, sequence, etc.).
 * - AllowedTypesIncompatibility: Indicates the differences in the allowed child types between the two schemas.
 * - ValueSchemaIncompatibility: Specifically indicates the differences in the `ValueSchema` of two
 * `LeafNodeStoredSchema` objects.
 *
 * 2. NodeIncompatibility
 *
 * `NodeIncompatibility` represents the differences between two `TreeNodeStoredSchema` objects and includes:
 *
 * - NodeKindIncompatibility: Indicates the differences in the types of `TreeNodeStoredSchema` (currently supports
 * `ObjectNodeStoredSchema`, `MapNodeStoredSchema`, and `LeafNodeStoredSchema`).
 * - NodeFieldsIncompatibility: Indicates the `FieldIncompatibility` of `TreeFieldStoredSchema` within two
 * `TreeNodeStoredSchema`. It includes an array of `FieldIncompatibility` instances in the `differences` field.
 *
 * When comparing two nodes for compatibility, it only makes sense to compare their fields if the nodes are of
 * the same kind (map, object, leaf).
 *
 * 3. Incompatibility
 *
 * Incompatibility consists of both `NodeIncompatibility` and `FieldIncompatibility`, representing any kind of
 * schema differences. See {@link getAllowedContentIncompatibilities} for more details about how we process it
 * and the ordering.
 */
export type Incompatibility = FieldIncompatibility | NodeIncompatibility;

export type NodeIncompatibility = NodeKindIncompatibility | NodeFieldsIncompatibility;

export type FieldIncompatibility =
	| AllowedTypeIncompatibility
	| FieldKindIncompatibility
	| ValueSchemaIncompatibility;

export interface AllowedTypeIncompatibility {
	identifier: string | undefined; // undefined indicates root field schema
	mismatch: "allowedTypes";
	/**
	 * List of allowed type identifiers in viewed schema
	 */
	view: string[];
	/**
	 * List of allowed type identifiers in stored schema
	 */
	stored: string[];
}

export interface FieldKindIncompatibility {
	identifier: string | undefined; // undefined indicates root field schema
	mismatch: "fieldKind";
	view: FieldKindIdentifier | undefined;
	stored: FieldKindIdentifier | undefined;
}

export interface ValueSchemaIncompatibility {
	identifier: string;
	mismatch: "valueSchema";
	view: ValueSchema | undefined;
	stored: ValueSchema | undefined;
}

export interface NodeKindIncompatibility {
	identifier: string;
	mismatch: "nodeKind";
	view: SchemaFactoryNodeKind | undefined;
	stored: SchemaFactoryNodeKind | undefined;
}

export interface NodeFieldsIncompatibility {
	identifier: string;
	mismatch: "fields";
	differences: FieldIncompatibility[];
}

type SchemaFactoryNodeKind = "object" | "leaf" | "map";

/**
 * @remarks
 *
 * The workflow for finding schema incompatibilities:
 * 1. Compare the two root schemas to identify any `FieldIncompatibility`.
 *
 * 2. For each node schema in the `view`:
 * - Verify if the node schema exists in the stored. If it does, ensure that the `SchemaFactoryNodeKind` are
 * consistent. Otherwise this difference is treated as `NodeKindIncompatibility`
 * - If a node schema with the same identifier exists in both view and stored, and their `SchemaFactoryNodeKind`
 * are consistent, perform a exhaustive validation to identify all `FieldIncompatibility`.
 *
 * 3. For each node schema in the stored, verify if it exists in the view. The overlapping parts were already
 * addressed in the previous step.
 *
 * @returns the discrepancies between two TreeStoredSchema objects
 */
export function getAllowedContentIncompatibilities(
	view: TreeStoredSchema,
	stored: TreeStoredSchema,
): Incompatibility[] {
	const incompatibilities: Incompatibility[] = [];

	// check root schema discrepancies
	incompatibilities.push(
		...trackFieldDiscrepancies(view.rootFieldSchema, stored.rootFieldSchema),
	);

	// Verify the existence and type of a node schema given its identifier (key), then determine if
	// an exhaustive search is necessary.
	const viewNodeKeys = new Set<TreeNodeSchemaIdentifier>();
	for (const [key, viewNodeSchema] of view.nodeSchema) {
		viewNodeKeys.add(key);

		if (viewNodeSchema instanceof ObjectNodeStoredSchema) {
			if (!stored.nodeSchema.has(key)) {
				incompatibilities.push({
					identifier: key,
					mismatch: "nodeKind",
					view: "object",
					stored: undefined,
				});
			} else {
				const storedNodeSchema = stored.nodeSchema.get(key);
				assert(
					storedNodeSchema !== undefined,
					0x9be /* The storedNodeSchema in stored.nodeSchema should not be undefined */,
				);
				if (storedNodeSchema instanceof MapNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "object",
						stored: "map",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof LeafNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "object",
						stored: "leaf",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof ObjectNodeStoredSchema) {
					const differences = trackObjectNodeDiscrepancies(viewNodeSchema, storedNodeSchema);
					if (differences.length > 0) {
						incompatibilities.push({
							identifier: key,
							mismatch: "fields",
							differences,
						} satisfies NodeFieldsIncompatibility);
					}
				} else {
					throwUnsupportedNodeType(storedNodeSchema.constructor.name);
				}
			}
		} else if (viewNodeSchema instanceof MapNodeStoredSchema) {
			if (!stored.nodeSchema.has(key)) {
				incompatibilities.push({
					identifier: key,
					mismatch: "nodeKind",
					view: "map",
					stored: undefined,
				} satisfies NodeKindIncompatibility);
			} else {
				const storedNodeSchema = stored.nodeSchema.get(key);
				assert(
					storedNodeSchema !== undefined,
					0x9bf /* The storedNodeSchema in stored.nodeSchema should not be undefined */,
				);
				if (storedNodeSchema instanceof ObjectNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "map",
						stored: "object",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof LeafNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "map",
						stored: "leaf",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof MapNodeStoredSchema) {
					incompatibilities.push(
						...trackFieldDiscrepancies(
							viewNodeSchema.mapFields,
							storedNodeSchema.mapFields,
							key,
						),
					);
				} else {
					throwUnsupportedNodeType(storedNodeSchema.constructor.name);
				}
			}
		} else if (viewNodeSchema instanceof LeafNodeStoredSchema) {
			if (!stored.nodeSchema.has(key)) {
				incompatibilities.push({
					identifier: key,
					mismatch: "nodeKind",
					view: "leaf",
					stored: undefined,
				});
			} else {
				const storedNodeSchema = stored.nodeSchema.get(key);
				assert(
					storedNodeSchema !== undefined,
					0x9c0 /* The storedNodeSchema in stored.nodeSchema should not be undefined */,
				);
				if (storedNodeSchema instanceof MapNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "leaf",
						stored: "map",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof ObjectNodeStoredSchema) {
					incompatibilities.push({
						identifier: key,
						mismatch: "nodeKind",
						view: "leaf",
						stored: "object",
					} satisfies NodeKindIncompatibility);
				} else if (storedNodeSchema instanceof LeafNodeStoredSchema) {
					if (viewNodeSchema.leafValue !== storedNodeSchema.leafValue) {
						incompatibilities.push({
							identifier: key,
							mismatch: "valueSchema",
							view: viewNodeSchema.leafValue,
							stored: storedNodeSchema.leafValue,
						} satisfies ValueSchemaIncompatibility);
					}
				} else {
					throwUnsupportedNodeType(storedNodeSchema.constructor.name);
				}
			}
		} else {
			throwUnsupportedNodeType(viewNodeSchema.constructor.name);
		}
	}

	for (const [key, storedNodeSchema] of stored.nodeSchema) {
		if (!viewNodeKeys.has(key)) {
			incompatibilities.push({
				identifier: key,
				mismatch: "nodeKind",
				view: undefined,
				stored:
					storedNodeSchema instanceof MapNodeStoredSchema
						? "map"
						: storedNodeSchema instanceof ObjectNodeStoredSchema
							? "object"
							: "leaf",
			} satisfies NodeKindIncompatibility);
		}
	}

	return incompatibilities;
}

/**
 * The function to track the discrepancies between two field stored schemas.
 *
 * @param keyOrRoot - If the key is missing, it indicates that this is the root field schema.
 */
function trackFieldDiscrepancies(
	view: TreeFieldStoredSchema,
	stored: TreeFieldStoredSchema,
	keyOrRoot?: string,
): FieldIncompatibility[] {
	const differences: FieldIncompatibility[] = [];

	// Only track the intersection of the two sets.
	const findSetDiscrepancies = (
		a: TreeTypeSet,
		b: TreeTypeSet,
	): [TreeNodeSchemaIdentifier[], TreeNodeSchemaIdentifier[]] => {
		if (a === undefined && b === undefined) {
			return [[], []];
		}

		if (a !== undefined && b !== undefined) {
			const aDiff = [...a].filter((value) => !b.has(value));
			const bDiff = [...b].filter((value) => !a.has(value));
			return [aDiff, bDiff];
		}

		if (a !== undefined) {
			return [[...a], []];
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return [[], [...b!]];
	};

	const allowedTypesDiscrepancies = findSetDiscrepancies(view.types, stored.types);
	if (allowedTypesDiscrepancies[0].length > 0 || allowedTypesDiscrepancies[1].length > 0) {
		differences.push({
			identifier: keyOrRoot,
			mismatch: "allowedTypes",
			view: allowedTypesDiscrepancies[0],
			stored: allowedTypesDiscrepancies[1],
		} satisfies AllowedTypeIncompatibility);
	}

	if (view.kind !== stored.kind) {
		differences.push({
			identifier: keyOrRoot,
			mismatch: "fieldKind",
			view: view.kind,
			stored: stored.kind,
		} satisfies FieldKindIncompatibility);
	}

	return differences;
}

function trackObjectNodeDiscrepancies(
	view: ObjectNodeStoredSchema,
	stored: ObjectNodeStoredSchema,
): FieldIncompatibility[] {
	const differences: FieldIncompatibility[] = [];
	const viewFieldKeys = new Set<FieldKey>();
	/**
	 * Similar to the logic used for tracking discrepancies between two node schemas, we will identify
	 * three types of differences:
	 * 1. Fields that exist in the view schema but not in the stored schema.
	 * 2. Fields that exist in both schemas but have different contents.
	 * 3. Fields that exist in the stored schema but not in the view schema.
	 *
	 * First, the view schema is iterated to track the first two types of differences.
	 * Then, the stored schema is iterated to find the third type.
	 */

	for (const [fieldKey, fieldStoredSchema] of view.objectNodeFields) {
		viewFieldKeys.add(fieldKey);
		if (!stored.objectNodeFields.has(fieldKey)) {
			differences.push({
				identifier: fieldKey,
				mismatch: "fieldKind",
				view: fieldStoredSchema.kind,
				stored: undefined,
			} satisfies FieldKindIncompatibility);
		} else {
			differences.push(
				...trackFieldDiscrepancies(
					view.objectNodeFields.get(fieldKey) as TreeFieldStoredSchema,
					stored.objectNodeFields.get(fieldKey) as TreeFieldStoredSchema,
					fieldKey,
				),
			);
		}
	}

	for (const [fieldKey, fieldStoredSchema] of stored.objectNodeFields) {
		if (viewFieldKeys.has(fieldKey)) {
			continue;
		}
		differences.push({
			identifier: fieldKey,
			mismatch: "fieldKind",
			view: undefined,
			stored: fieldStoredSchema.kind,
		} satisfies FieldKindIncompatibility);
	}

	return differences;
}

function throwUnsupportedNodeType(type: string): never {
	throw new TypeError(`Unsupported node stored schema type: ${type}`);
}
