/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import type { IEvent, IEventProvider } from "@fluidframework/common-definitions";
import { SharedString } from "@fluidframework/sequence";

/**
 * Events emitted by {@link IAppModel}.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAppModelEvents extends IEvent { }

/**
* Mock model for external task data
*/
export interface TaskData {
    [key: string]: {
        name: string;
        priority: number;
    };
};

/**
 * For this simple demo, our app model only needs a single member taskList.
 */
export interface IAppModel extends IEventProvider<IAppModelEvents> {
    /**
     * A task tracker list.
     */
    readonly taskList: ITaskList;

    /**
    * Send custom signals to the server which will cause the server to respond
    * with the (currently experimental) RuntimeMessage Signal to communicate
    * an external data change and and possibly the changed data as well
    */
    readonly debugSendCustomSignal: () => void;
}

/**
 * Events emitted by {@link ITask}.
 */
export interface ITaskEvents extends IEvent {
    /**
     * Emitted when the name or priority have changed respectively.
     */
    (event: "nameChanged" | "priorityChanged", listener: () => void);
}

/**
 * A single task, with functionality to inspect and modify its data.  Changes to this object will update the state
 * of the Fluid object, but will not automatically update the external data source.
 */
export interface ITask extends IEventProvider<ITaskEvents> {
    /**
     * The immutable ID for the task.
     */
    readonly id: string;
    /**
     * The task name.  Modifications are persisted in Fluid and shared amongst collaborators.
     */
    readonly name: SharedString;
    /**
     * The task priority.  Modifications are persisted in Fluid and shared amongst collaborators.
     */
    priority: number;
}

/**
 * Events emitted by {@link ITaskList}.
 */
export interface ITaskListEvents extends IEvent {
    /**
     * Emitted when a task is added/removed respectively.
     */
    (event: "taskAdded" | "taskDeleted", listener: (task: ITask) => void);
}

/**
 * ITaskList represents a "drafting surface" for changes to a task list stored in some external source.  Changes to
 * the ITaskList and its constituent ITasks are persisted in Fluid and shared amongst collaborators, but none of the
 * changes are persisted back to the external source until the user explicitly chooses to do so.
 * TODO: We'll want to eventually show variations of this behavior (e.g. more automatic or less automatic sync'ing).
 */
export interface ITaskList extends IEventProvider<ITaskListEvents> {
    /**
     * Add a task with the specified ID, initial name, and priority.
     * TODO: most likely, the ID should be automatically generated by the external source.  However, we won't
     * actually be adding this task to the external data source until a sync happens.  What should the ID be in the
     * interim period -- e.g. is there a "Fluid ID" vs. the real ID?
     */
    readonly addTask: (id: string, name: string, priority: number) => void;
    /**
     * Delete the task with the specified ID.
     */
    readonly deleteTask: (id: string) => void;

    /**
     * Get the sync status of the Fluid container. True if synced.
     */
    readonly getSync: () => boolean;

    /**
     * Get the full list of tasks.
     */
    readonly getTasks: () => ITask[];
    /**
     * Get the task with the specified ID.
     */
    readonly getTask: (id: string) => ITask | undefined;

    /**
     * Persist the current state of the Fluid data back to the external data source.
     */
    readonly saveChanges: () => Promise<void>;

    /**
     * Kick off fetching external data directly from the TaskList.
     * Triggered on receipt of ExternalDataChanged signal from container.
     */
    readonly importExternalData: () => Promise<void>;

    // TODO: Should there be an imperative API to trigger importing changes from the external source?
    // Even if we don't want this to be how the signal gets routed, we might want a "fetch latest changes" button
    // in the UI.
    // readonly fetchNewChanges: () => Promise<void>;

    // TODO: For the signal we might prefer routing it in as an unknown message payload, delegating interpretation
    // Alternate: inject an EventEmitter that raises the events from external.
    // readonly handleExternalMessage: (message) => void;
}
