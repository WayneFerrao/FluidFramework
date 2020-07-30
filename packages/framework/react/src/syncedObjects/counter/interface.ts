/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ISharedCounter } from "@fluidframework/counter";
import {
    IFluidFunctionalComponentViewState,
    IFluidFunctionalComponentFluidState,
    IFluidReducer,
    IFluidDataProps,
    FluidStateUpdateFunction,
} from "../..";

/**
 * The state interface exposed to the view for the synced counter
 */
export interface ISyncedCounterViewState extends IFluidFunctionalComponentViewState {
    value: number;
}

/**
 * The state interface for the Fluid data source that powers the synced counter
 */
export interface ISyncedCounterFluidState extends IFluidFunctionalComponentFluidState {
    counter: ISharedCounter;
}

/**
 * The reducer interface for incrementing the synced counter
 */
export interface ISyncedCounterReducer {
    increment: (step: number) => void;
}

/**
 * The underlying reducer interface passed to the useReducerFluid hook to bind the view and Fluid
 * state definitions together
 */
export interface IFluidSyncedCounterReducer<
    SV extends IFluidFunctionalComponentViewState,
    SF extends IFluidFunctionalComponentFluidState
    > extends IFluidReducer<SV, SF, IFluidDataProps> {
    increment: FluidStateUpdateFunction<SV, SF, IFluidDataProps>;
}
