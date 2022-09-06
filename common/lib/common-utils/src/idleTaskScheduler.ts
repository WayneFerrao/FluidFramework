/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { ITelemetryProperties } from "@fluidframework/common-definitions";


interface Task {
    handle: () => any,
}


/**
 * Helper class that is used to schedule non-essential tasks
 * Time measurements are in milliseconds as a floating point with a decimal
 */
export default class IdleTaskScheduler {
    //List of tasks waiting to be run
    private idleTaskList:  Task[] = [];
    // A reference to the task currently being processed.
    private taskHandle = 0;

    /*
    Add tasks to FIFO queue of tasks that are run during idle callback period.
    Creates idle callback if it doesn't exist with a timeout of 1s.
    */
    public enqueueTask<T>(task: () => T){
        let newTask: Task;
        newTask = {
            handle: task
        }
        this.idleTaskList.push(newTask)

        if (this.taskHandle) {
            this.taskHandle = requestIdleCallback(this.runTaskQueue, { timeout: 1000 });
          }
    }

    // Called and runs enqueued tasks when enough idle time avail or 1s timeout expires.
    public runTaskQueue(deadline){
        while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && this.idleTaskList.length) {
            let task = this.idleTaskList.shift();
            task?.handle;
          }
          if (this.idleTaskList.length) {
            this.taskHandle = requestIdleCallback(this.runTaskQueue, { timeout: 1000} );
          } else { // Set to 0 so indicate we don't have a callback scheduled
            this.taskHandle = 0;
          }
    }
    /*
    Takes in and runs a callback function during idle time. Fallback to setTimeout if window doesn't
    support requestIdleCallback
    */
    public scheduleIdleTask<T> (callback: () => T, timeout: number, props: ITelemetryProperties) {
        if('requestIdleCallback' in window){
            this.enqueueTask(callback);
            requestIdleCallback(callback, {timeout: timeout});

        } else {
            setTimeout(() => {
                callback;
            }, 100)
        }
    }
}
