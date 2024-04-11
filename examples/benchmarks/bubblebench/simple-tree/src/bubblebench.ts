/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { DataObject, DataObjectFactory } from "@fluidframework/aqueduct/internal";
import { IFluidHandle } from "@fluidframework/core-interfaces";
import { ISharedTree, SharedTreeFactory, type TreeView, fail } from "@fluidframework/tree/internal";
import { AppState } from "./appState.js";
import { type App, appTreeConfiguration } from "./schema.js";

// Key used to store/retrieve the SharedTree instance within the root SharedMap.
const treeKey = "treeKey";

/**
 * @internal
 */
export class Bubblebench extends DataObject {
	public static readonly Name = "@fluid-example/bubblebench-simpletree";

	private view: TreeView<typeof App> | undefined;
	private _appState: AppState | undefined;

	protected async initializingFirstTime() {
		const tree = this.runtime.createChannel(
			/* id: */ undefined,
			new SharedTreeFactory().type,
		) as ISharedTree;

		this.initializeTree(tree);
		this.root.set(treeKey, tree.handle);
	}

	protected async initializingFromExisting() {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const tree = await this.root.get<IFluidHandle<ISharedTree>>(treeKey)!.get();
		this.initializeTree(tree);
	}

	protected async hasInitialized() {
		this._appState = new AppState(
			this.tree,
			/* stageWidth: */ 640,
			/* stageHeight: */ 480,
			/* numBubbles: */ 1,
		);

		const onConnected = () => {
			// Out of paranoia, we periodically check to see if your client Id has changed and
			// update the tree if it has.
			setInterval(() => {
				const clientId = this.runtime.clientId;
				if (clientId !== undefined && clientId !== this.appState.localClient.clientId) {
					this.appState.localClient.clientId = clientId;
				}
			}, 1000);
		};

		// Wait for connection to begin checking client Id.
		if (this.runtime.connected) {
			onConnected();
		} else {
			this.runtime.once("connected", onConnected);
		}
	}

	/**
	 * Initialize the schema of the shared tree to that of the Bubblebench AppState.
	 * @param tree - ISharedTree
	 */
	initializeTree(tree: ISharedTree) {
		this.view = tree.schematize(appTreeConfiguration);
	}

	/**
	 * Get the SharedTree.
	 * Cannot be accessed until after initialization has completed.
	 */
	private get tree(): TreeView<typeof App> {
		return this.view ?? fail("not initialized");
	}

	/**
	 * Get the AppState.
	 * Cannot be accessed until after initialization has completed.
	 */
	public get appState(): AppState {
		return this._appState ?? fail("not initialized");
	}
}

/**
 * The DataObjectFactory declares the Fluid object and defines any additional distributed data structures.
 * To add a SharedSequence, SharedMap, or any other structure, put it in the array below.
 * @internal
 */
export const BubblebenchInstantiationFactory = new DataObjectFactory(
	Bubblebench.Name,
	Bubblebench,
	[new SharedTreeFactory()], // This is fine for now  but we will have to adjust this API later to allow control of write format
	{},
);
