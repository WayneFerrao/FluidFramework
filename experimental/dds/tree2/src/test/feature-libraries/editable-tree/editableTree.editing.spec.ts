/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { validateAssertionError } from "@fluidframework/test-runtime-utils";
import {
	AllowedUpdateType,
	JsonableTree,
	LocalFieldKey,
	TreeSchemaIdentifier,
} from "../../../core";
import { createSharedTreeView, ISharedTree } from "../../../shared-tree";
import { brand, clone } from "../../../util";
import {
	singleTextCursor,
	isEditableTree,
	getField,
	isEditableField,
	FieldKinds,
	valueSymbol,
	typeNameSymbol,
	isContextuallyTypedNodeDataObject,
	getPrimaryField,
	SchemaBuilder,
	FieldKindTypes,
	TypedSchemaCollection,
	GlobalFieldSchema,
	UnwrappedEditableField,
} from "../../../feature-libraries";
import { TestTreeProviderLite } from "../../utils";
import {
	fullSchemaData,
	Person,
	stringSchema,
	Int32,
	getPerson,
	SimplePhones,
	complexPhoneSchema,
	ComplexPhone,
	Address,
	float64Schema,
	Phones,
	phonesSchema,
	personJsonableTree,
	personSchemaLibrary,
} from "./mockData";

const localFieldKey: LocalFieldKey = brand("foo");
const otherFieldKey: LocalFieldKey = brand("foo2");

const rootSchemaName: TreeSchemaIdentifier = brand("Test");

function getTestSchema<Kind extends FieldKindTypes>(fieldKind: Kind) {
	const builder = new SchemaBuilder("getTestSchema", personSchemaLibrary);
	const rootNodeSchema = builder.struct("Test", {
		foo: SchemaBuilder.field(fieldKind, stringSchema),
		foo2: SchemaBuilder.field(fieldKind, stringSchema),
	});
	return builder.intoDocumentSchema(SchemaBuilder.field(FieldKinds.optional, rootNodeSchema));
}

// TODO: There are two kinds of users of this in this file. Both should be changed:
// Tests which are testing collaboration between multiple trees should be adjusted to not do that, or moved elsewhere (merge/collaboration is not the focus of this file).
// Tests which are using a single tree should just use a MockFluidDataStoreRuntime instead of all the complexity of TestTreeProvider.
function createSharedTrees(
	schemaData: TypedSchemaCollection<GlobalFieldSchema>,
	data?: JsonableTree[],
	numberOfTrees = 1,
): readonly [TestTreeProviderLite, readonly ISharedTree[]] {
	const provider = new TestTreeProviderLite(numberOfTrees);
	for (const tree of provider.trees) {
		assert(tree.isAttached());
	}
	provider.trees[0].schematize({
		allowedSchemaModifications: AllowedUpdateType.None,
		initialTree: data?.map(singleTextCursor),
		schema: schemaData,
	});
	provider.trees[0].storedSchema.update(schemaData);
	if (data !== undefined) {
		provider.trees[0].context.root.content = data.map(singleTextCursor);
	}
	provider.processMessages();
	return [provider, provider.trees];
}

describe("editable-tree: editing", () => {
	it("edit using contextually typed API", () => {
		const [, trees] = createSharedTrees(fullSchemaData, [personJsonableTree()]);
		assert.equal((trees[0].root as Person).name, "Adam");
		// delete optional root
		trees[0].root = undefined;
		assert.equal(trees[0].root, undefined);

		// create optional root
		trees[0].root = { name: "Mike" };
		assert.deepEqual(clone(trees[0].root), { name: "Mike" });

		// replace optional root
		trees[0].root = { name: "Peter", adult: true };

		assert(isContextuallyTypedNodeDataObject(trees[0].root));
		const maybePerson = trees[0].root;
		// unambiguously typed field
		maybePerson.age = 150;

		// polymorphic field supports:
		// - Float64 schema (number-based)
		// - Int32 schema (number-based)
		// - String schema
		maybePerson.salary = {
			[valueSymbol]: "100.1",
			[typeNameSymbol]: stringSchema.name,
		};
		// unambiguous type
		maybePerson.salary = "not ok";
		// ambiguous type since there are multiple options which are numbers:
		assert.throws(
			() => (maybePerson.salary = 99.99),
			(e) =>
				validateAssertionError(
					e,
					"data compatible with more than one type allowed by the schema",
				),
		);
		// explicit typing
		maybePerson.salary = {
			[typeNameSymbol]: float64Schema.name,
			[valueSymbol]: 99.99,
		};

		// Map<String>
		maybePerson.friends = { Anna: "Anna" };
		maybePerson.friends.John = "John";

		maybePerson.address = {
			zip: 345,
			city: "Bonn",
			// polymorphic field (uses Int32, string, ComplexPhone and SimplePhones schemas)
			phones: [
				"+491234567890",
				{
					[typeNameSymbol]: complexPhoneSchema.name,
					prefix: "+49",
					number: "1234567",
				},
			],
		};
		// make sure the value is not set at the primary field parent node
		{
			const person = trees[0].root as Person;
			assert(isEditableTree(person.address));
			const phones = person.address[getField](brand("phones"));
			assert.equal(phones.getNode(0)[valueSymbol], undefined);
		}
		maybePerson.address.street = "unknown";

		{
			// TODO: fix typing of property access in EditableTree (broken by assignment support) and remove this "as"
			const phones = maybePerson.address.phones as UnwrappedEditableField;
			assert(isEditableField(phones));

			// can use strict types to access the data
			assert.equal((phones as Phones)[0], "+491234567890");

			assert.equal(phones[0], "+491234567890");
			assert.equal(Array.isArray(phones), false);
			phones[0] = "+1234567890";

			// can still use the EditableTree API at children
			{
				assert.equal(
					phones.fieldSchema.kind.identifier,
					getPrimaryField(phonesSchema)?.schema.kind.identifier,
				);
				assert.deepEqual(
					phones.fieldSchema.types,
					getPrimaryField(phonesSchema)?.schema.types,
				);
				// can use the contextually typed API again
				phones[1] = {
					[typeNameSymbol]: complexPhoneSchema.name,
					prefix: "+1",
					number: "2345",
				} as unknown as ComplexPhone;
			}
		}

		const clonedPerson = clone(maybePerson);
		assert.deepEqual(clonedPerson, {
			name: "Peter",
			age: 150,
			adult: true,
			salary: 99.99,
			friends: {
				Anna: "Anna",
				John: "John",
			},
			address: {
				zip: 345,
				city: "Bonn",
				street: "unknown",
				phones: {
					"0": "+1234567890",
					"1": {
						prefix: "+1",
						number: "2345",
					},
				},
			},
		});
	});

	it("edit using typed data model", () => {
		const [, trees] = createSharedTrees(fullSchemaData);

		trees[0].root = getPerson();
		const person = trees[0].root as Person;

		// check initial data
		{
			const clonedPerson = clone(person);
			assert.deepEqual(clonedPerson, {
				name: "Adam",
				age: 35,
				adult: true,
				salary: 10420.2,
				friends: {
					Mat: "Mat",
				},
				address: {
					zip: "99999",
					street: "treeStreet",
					phones: {
						"0": "+49123456778",
						"1": 123456879,
						"2": {
							prefix: "0123",
							number: "012345",
							extraPhones: { "0": "91919191" },
						},
						"3": {
							"0": "112",
							"1": "113",
						},
					},
					sequencePhones: { "0": "113", "1": "114" },
				},
			});
		}

		{
			delete person.age;
			// create optional field
			person.age = brand(32);

			// replace optional field
			person.address = {
				zip: "99999",
				street: "foo",
				phones: [12345],
			} as unknown as Address; // TODO: fix up these strong types to reflect unwrapping
			assert(person.address !== undefined);

			// create sequence field
			person.address.sequencePhones = brand(["999"]);

			const zip: Int32 = brand(123);
			// replace value field
			person.address.zip = zip;

			const clonedAddress = clone(person.address);
			assert.deepEqual(clonedAddress, {
				street: "foo",
				zip: 123,
				phones: {
					"0": 12345,
				},
				sequencePhones: {
					"0": "999",
				},
			});

			// replace sequence field
			person.address.sequencePhones = brand(["111"]);
			// replace array (optional field with primary sequence field)
			person.address.phones = brand(["54321"]);
			assert(person.address.phones !== undefined);
			const simplePhones: SimplePhones = brand(["555"]);
			// create node as array (node has a primary field)
			person.address.phones[1] = simplePhones;
			// create primitive node
			person.address.phones[2] = brand(3);
			const clonedPerson = clone(person);
			assert.deepEqual(clonedPerson, {
				name: "Adam",
				age: 32,
				adult: true,
				salary: 10420.2,
				friends: {
					Mat: "Mat",
				},
				address: {
					street: "foo",
					zip: 123,
					phones: {
						"0": "54321",
						"1": {
							"0": "555",
						},
						"2": 3,
					},
					sequencePhones: {
						"0": "111",
					},
				},
			});
			// replace node
			person.address.phones[1] = {
				[typeNameSymbol]: complexPhoneSchema.name,
				number: "123",
				prefix: "456",
				extraPhones: ["1234567"],
			} as unknown as ComplexPhone; // TODO: fix up these strong types to reflect unwrapping
			assert.deepEqual(clone(person.address.phones), {
				"0": "54321",
				"1": { number: "123", prefix: "456", extraPhones: { "0": "1234567" } },
				"2": 3,
			});
		}
	});

	describe(`can move nodes`, () => {
		it("to the left within the same field", () => {
			const [provider, trees] = createSharedTrees(getTestSchema(FieldKinds.sequence), [
				{ type: rootSchemaName },
			]);
			assert(isEditableTree(trees[0].root));
			// create using `insertNodes`
			trees[0].root[getField](localFieldKey).insertNodes(0, [
				singleTextCursor({ type: stringSchema.name, value: "foo" }),
				singleTextCursor({ type: stringSchema.name, value: "bar" }),
			]);
			const field_0 = trees[0].root[localFieldKey];
			assert(isEditableField(field_0));
			assert.deepEqual([...field_0], ["foo", "bar"]);

			// move node
			field_0.moveNodes(1, 1, 0);

			// check that node was moved from field_0
			assert.deepEqual([...field_0], ["bar", "foo"]);
		});
		it("to the right within the same field", () => {
			const [provider, trees] = createSharedTrees(getTestSchema(FieldKinds.sequence), [
				{ type: rootSchemaName },
			]);
			assert(isEditableTree(trees[0].root));
			// create using `insertNodes`
			trees[0].root[getField](localFieldKey).insertNodes(0, [
				singleTextCursor({ type: stringSchema.name, value: "foo" }),
				singleTextCursor({ type: stringSchema.name, value: "bar" }),
			]);
			const field_0 = trees[0].root[localFieldKey];
			assert(isEditableField(field_0));
			assert.deepEqual([...field_0], ["foo", "bar"]);

			// move node
			field_0.moveNodes(0, 1, 1);

			// check that node was moved from field_0
			assert.deepEqual([...field_0], ["bar", "foo"]);
		});
		it("to a different field", () => {
			const [provider, trees] = createSharedTrees(getTestSchema(FieldKinds.sequence), [
				{ type: rootSchemaName },
			]);
			assert(isEditableTree(trees[0].root));
			// create using `insertNodes`
			trees[0].root[getField](localFieldKey).insertNodes(0, [
				singleTextCursor({ type: stringSchema.name, value: "foo" }),
				singleTextCursor({ type: stringSchema.name, value: "bar" }),
			]);
			trees[0].root[getField](otherFieldKey).insertNodes(0, [
				singleTextCursor({ type: stringSchema.name, value: "foo" }),
				singleTextCursor({ type: stringSchema.name, value: "bar" }),
			]);
			const field_0 = trees[0].root[localFieldKey];
			assert(isEditableField(field_0));
			assert.deepEqual([...field_0], ["foo", "bar"]);

			const field_1 = trees[0].root[otherFieldKey];
			assert(isEditableField(field_1));
			assert.deepEqual([...field_1], ["foo", "bar"]);

			// move node
			field_0.moveNodes(0, 1, 1, field_1);

			// check that node was moved out from field_0
			assert.deepEqual([...field_0], ["bar"]);

			// check that node was moved into field_1
			assert.deepEqual([...field_1], ["foo", "foo", "bar"]);
		});
	});

	describe(`can create, edit, move and delete`, () => {
		it("insertNodes in a sequence field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.sequence),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: [], foo2: [] },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[localFieldKey];
			assert(isEditableField(field));

			// create using `insertNodes`
			field.insertNodes(0, ["foo", "bar"]);
			assert.deepEqual([...field], ["foo", "bar"]);

			field.delete();
			// create using `insertNodes()`
			["third", "second", "first"].forEach((content) => field.insertNodes(0, [content]));
			assert.deepEqual([...field], ["first", "second", "third"]);
			assert.throws(
				() => field.insertNodes(5, ["x"]),
				(e) => validateAssertionError(e, "Index must be less than or equal to length."),
				"Expected exception was not thrown",
			);
		});

		it("replaceNodes in a sequence field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.sequence),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: [], foo2: [] },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[localFieldKey];
			assert(isEditableField(field));

			assert.throws(
				() => field.replaceNodes(1, ["x"]),
				(e) =>
					validateAssertionError(
						e,
						"Index must be less than length or, if the field is empty, be 0.",
					),
				"Expected exception was not thrown",
			);

			field.content = ["a", "b", "c"];
			field.replaceNodes(1, ["changed"], 1);
			assert.deepEqual([...field], ["a", "changed", "c"]);
			field.replaceNodes(0, [], 1);
			assert.deepEqual([...field], ["changed", "c"]);
			field.replaceNodes(1, ["x", "y"], 0);
			assert.deepEqual([...field], ["changed", "x", "y", "c"]);
		});

		it("moveNodes in a sequence field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.sequence),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: ["a", "b", "c"], foo2: [] },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[localFieldKey];
			assert(isEditableField(field));

			const firstNodeBeforeMove = field[0];
			// move using `moveNodes()`
			field.moveNodes(0, 1, 1);
			const secondNodeAfterMove = field[1];
			assert.equal(firstNodeBeforeMove, secondNodeAfterMove);
			assert.deepEqual([...field], ["b", "a", "c"]);
		});

		it("assignment and deletion on sequence field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.sequence),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: [], foo2: [] },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[getField](localFieldKey);
			assert.deepEqual([...field], []);

			// Using .content
			field.content = ["foo", "foo"];
			assert.deepEqual([...field], ["foo", "foo"]);
			field.content = [];
			assert.deepEqual([...field], []);
			field.content = ["foo"];
			assert.deepEqual([...field], ["foo"]);

			// edit using assignment
			root[localFieldKey] = ["1"] as any; // Can't be type safe to to index signature variance limitation.
			assert.deepEqual([...field], ["1"]);

			// edit using indexing
			field[0] = "replaced";
			assert.deepEqual([...field], ["replaced"]);

			// delete
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete root[localFieldKey];
			assert(!(localFieldKey in root));
			assert.deepEqual([...field], []);

			// Restore
			field.content = ["bar"];
			assert.deepEqual([...field], ["bar"]);

			// delete assignment
			assert.throws(() => {
				root[localFieldKey] = undefined;
			});

			// delete content assignment
			assert.throws(() => {
				field.content = undefined;
			});

			// delete method
			field.delete();
			assert(!(localFieldKey in root));
			assert.deepEqual([...field], []);
		});

		it("regression test for sequence setting empty sequence", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.sequence),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: [], foo2: [] },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[getField](localFieldKey);
			field.content = [];
			assert.deepEqual([...field], []);
		});

		it("as optional field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.optional),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: undefined, foo2: undefined },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[getField](localFieldKey);
			assert.equal(field.content, undefined);
			assert.equal(root[localFieldKey], undefined);

			// create
			assert.throws(
				() => {
					assert(isEditableTree(root));
					field.content = ["foo", "foo"];
				},
				(e) => validateAssertionError(e, /incompatible/),
			);

			// Using .content
			field.content = "foo";
			assert.equal(root[localFieldKey], "foo");
			{
				const child = field.content;
				assert(isEditableTree(child));
				assert.equal(child[valueSymbol], "foo");
			}

			// edit using assignment
			root[localFieldKey] = "bar";
			assert.equal(root[localFieldKey], "bar");

			// edit using indexing
			field[0] = "replaced";
			assert.equal(root[localFieldKey], "replaced");

			// delete
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete root[localFieldKey];
			assert(!(localFieldKey in root));
			assert.equal(root[localFieldKey], undefined);

			// Restore
			root[localFieldKey] = "bar";
			assert.equal(root[localFieldKey], "bar");

			// delete assignment
			root[localFieldKey] = undefined;
			assert(!(localFieldKey in root));
			assert.equal(root[localFieldKey], undefined);

			// Restore
			root[localFieldKey] = "bar";
			assert.equal(root[localFieldKey], "bar");

			// delete content assignment
			field.content = undefined;
			assert(!(localFieldKey in root));
			assert.equal(root[localFieldKey], undefined);

			// Restore
			root[localFieldKey] = "bar";
			assert.equal(root[localFieldKey], "bar");

			// delete method
			field.delete();
			assert(!(localFieldKey in root));
			assert.equal(root[localFieldKey], undefined);
		});

		it("as value field", () => {
			const view = createSharedTreeView().schematize({
				schema: getTestSchema(FieldKinds.value),
				allowedSchemaModifications: AllowedUpdateType.None,
				initialTree: { foo: "initial", foo2: "" },
			});
			const root = view.root;
			assert(isEditableTree(root));
			const field = root[getField](localFieldKey);
			assert.equal(root[localFieldKey], "initial");

			// create
			assert.throws(
				() => {
					assert(isEditableTree(root));
					field.content = ["foo", "foo"];
				},
				(e) => validateAssertionError(e, /incompatible/),
			);

			// Using .content
			field.content = "foo";
			assert.equal(root[localFieldKey], "foo");

			// edit using assignment
			root[localFieldKey] = "bar";
			assert.equal(root[localFieldKey], "bar");

			// edit using indexing
			field[0] = "replaced";
			assert.equal(root[localFieldKey], "replaced");

			// delete
			assert.throws(() => {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete root[localFieldKey];
			});

			// delete assignment
			assert.throws(() => {
				root[localFieldKey] = undefined;
			});

			// delete content assignment
			assert.throws(() => {
				field.content = undefined;
			});

			// delete method
			assert.throws(() => {
				field.delete();
			});
		});
	});
});
