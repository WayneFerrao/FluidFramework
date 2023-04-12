/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { IconButton, IStackItemStyles, Stack, StackItem, TooltipHost } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";
import {
	Badge,
	createTableColumn,
	Table,
	TableRow,
	TableCell,
	TableCellLayout,
	TableColumnDefinition,
	TableColumnSizingOptions,
	useTableFeatures,
	useTableColumnSizing_unstable,
} from "@fluentui/react-components";
import React from "react";

import {
	CloseContainer,
	ConnectContainer,
	ContainerStateChange,
	ContainerStateMetadata,
	DisconnectContainer,
	GetContainerState,
	handleIncomingMessage,
	HasContainerId,
	IMessageRelay,
	InboundHandlers,
	ISourcedDevtoolsMessage,
} from "@fluid-tools/client-debugger";
import { AttachState } from "@fluidframework/container-definitions";
import { ConnectionState } from "@fluidframework/container-loader";

import { initializeFluentUiIcons } from "../InitializeIcons";
import { connectionStateToString } from "../Utilities";
import { useMessageRelay } from "../MessageRelayContext";
import { Waiting } from "./Waiting";

// Ensure FluentUI icons are initialized for use below.
initializeFluentUiIcons();

// TODOs:
// - Add info tooltips (with question mark icons?) for each piece of Container status info to
//   help education consumers as to what the different statuses mean.

/**
 * {@link ContainerSummaryView} input props.
 */
export type ContainerSummaryViewProps = HasContainerId;

const columnsDef: TableColumnDefinition<Item>[] = [
	createTableColumn<Item>({
		columnId: "containerProperty",
	}),
	createTableColumn<Item>({
		columnId: "value",
	}),
];
interface Item {
	property: string;
	value: string;
}

/**
 * Debugger view displaying basic Container stats.
 */
export function ContainerSummaryView(props: ContainerSummaryViewProps): React.ReactElement {
	const { containerId } = props;
	const items = [];
	const messageRelay: IMessageRelay = useMessageRelay();

	const [containerState, setContainerState] = React.useState<
		ContainerStateMetadata | undefined
	>();
	const [columns] = React.useState<TableColumnDefinition<Item>[]>(columnsDef);
	const [columnSizingOptions] = React.useState<TableColumnSizingOptions>({
		containerProperty: {
			idealWidth: 80,
			minWidth: 80,
		},
	});

	const { columnSizing_unstable, tableRef } = useTableFeatures({ columns, items }, [
		useTableColumnSizing_unstable({ columnSizingOptions }),
	]);

	React.useEffect(() => {
		/**
		 * Handlers for inbound messages related to the registry.
		 */
		const inboundMessageHandlers: InboundHandlers = {
			[ContainerStateChange.MessageType]: (untypedMessage) => {
				const message = untypedMessage as ContainerStateChange.Message;
				if (message.data.containerId === containerId) {
					setContainerState(message.data.containerState);
					return true;
				}
				return false;
			},
		};

		/**
		 * Event handler for messages coming from the webpage.
		 */
		function messageHandler(message: Partial<ISourcedDevtoolsMessage>): void {
			handleIncomingMessage(message, inboundMessageHandlers, {
				context: "ContainerSummaryView", // TODO: fix
			});
		}

		messageRelay.on("message", messageHandler);

		// Reset state with Container data, to ensure we aren't displaying stale data (for the wrong container) while we
		// wait for a response to the message sent below. Especially relevant for the Container-related views because this
		// component wont be unloaded and reloaded if the user just changes the menu selection from one Container to another.
		// eslint-disable-next-line unicorn/no-useless-undefined
		setContainerState(undefined);

		// Request state info for the newly specified containerId
		messageRelay.postMessage(GetContainerState.createMessage({ containerId }));

		return (): void => {
			messageRelay.off("message", messageHandler);
		};
	}, [containerId, setContainerState, messageRelay]);

	if (containerState === undefined) {
		return <Waiting label="Waiting for Container Summary data." />;
	}

	function tryConnect(): void {
		messageRelay.postMessage(
			ConnectContainer.createMessage({
				containerId,
			}),
		);
	}

	function forceDisconnect(): void {
		messageRelay.postMessage(
			DisconnectContainer.createMessage({
				containerId,
				/* TODO: Specify debugger reason here once it is supported */
			}),
		);
	}

	function closeContainer(): void {
		messageRelay.postMessage(
			CloseContainer.createMessage({
				containerId,
				/* TODO: Specify debugger reason here once it is supported */
			}),
		);
	}

	// Build up status string
	const statusComponents: string[] = [];
	if (closed) {
		statusComponents.push("Closed");
	} else {
		statusComponents.push(containerState.attachState);
		if (containerState.attachState === AttachState.Attached) {
			statusComponents.push(connectionStateToString(containerState.connectionState));
		}
	}

	function DataRow(label: string, id: string | undefined): React.ReactElement {
		return (
			<TableRow>
				<TableCell {...columnSizing_unstable.getTableCellProps("containerProperty")}>
					<b>{label}</b>
				</TableCell>
				<TableCell>{id}</TableCell>
			</TableRow>
		);
	}

	function ContainerStatusRow(): React.ReactElement {
		return (
			<TableRow>
				<TableCell>
					<b>Status</b>
				</TableCell>
				<TableCell>
					<TableCellLayout
						media={((): JSX.Element => {
							switch (statusComponents[0]) {
								case "attaching":
									return (
										<Badge shape="rounded" color="warning">
											{statusComponents[0]}
										</Badge>
									);
								case "detached":
									return (
										<Badge shape="rounded" color="danger">
											{statusComponents[0]}
										</Badge>
									);
								default:
									return (
										<Badge shape="rounded" color="success">
											{statusComponents[0]}
										</Badge>
									);
							}
						})()}
					>
						{statusComponents[1] === "Connected" ? (
							<Badge shape="rounded" color="success">
								{statusComponents[1]}
							</Badge>
						) : (
							<Badge shape="rounded" color="danger">
								{statusComponents[1]}
							</Badge>
						)}
					</TableCellLayout>
				</TableCell>
			</TableRow>
		);
	}

	return (
		<Stack>
			<StackItem>
				<Table size="extra-small" ref={tableRef}>
					{DataRow("Container", containerState.id)}
					{ContainerStatusRow()}
					{DataRow("Client ID", containerState.clientId)}
					{DataRow("Audience ID", containerState.audienceId)}
				</Table>
			</StackItem>
			<StackItem align="end">
				<ActionsBar
					isContainerConnected={
						containerState.connectionState === ConnectionState.Connected
					}
					tryConnect={tryConnect}
					forceDisconnect={forceDisconnect}
					closeContainer={closeContainer}
				/>
			</StackItem>
		</Stack>
	);
}

/**
 * Container actions supported by the debugger view.
 */
export interface IContainerActions {
	/**
	 * Attempt to connect a disconnected Container.
	 *
	 * @remarks Button controls will be disabled if this is not provided.
	 */
	tryConnect?: () => void;

	/**
	 * Disconnect a connected Container.
	 *
	 * @remarks Button controls will be disabled if this is not provided.
	 */
	forceDisconnect?: () => void;

	/**
	 * Close the container.
	 *
	 * @remarks Button controls will be disabled if this is not provided.
	 */
	closeContainer?: () => void;
}

interface ActionsBarProps extends IContainerActions {
	isContainerConnected: boolean;
}

function ActionsBar(props: ActionsBarProps): React.ReactElement {
	const { isContainerConnected, tryConnect, forceDisconnect, closeContainer } = props;

	const connectButtonTooltipId = useId("connect-button-tooltip");
	const disconnectButtonTooltipId = useId("disconnect-button-tooltip");
	const disposeContainerButtonTooltipId = useId("dispose-container-button-tooltip");

	const changeConnectionStateButton = isContainerConnected ? (
		<TooltipHost content="Disconnect Container" id={disconnectButtonTooltipId}>
			<IconButton
				onClick={forceDisconnect}
				disabled={forceDisconnect === undefined}
				menuIconProps={{ iconName: "PlugDisconnected" }}
				aria-describedby={disconnectButtonTooltipId}
			/>
		</TooltipHost>
	) : (
		<TooltipHost content="Connect Container" id={connectButtonTooltipId}>
			<IconButton
				onClick={tryConnect}
				disabled={tryConnect === undefined}
				menuIconProps={{ iconName: "PlugConnected" }}
				aria-describedby={connectButtonTooltipId}
			/>
		</TooltipHost>
	);

	const disposeContainerButton = (
		<TooltipHost content="Close Container" id={disposeContainerButtonTooltipId}>
			<IconButton
				onClick={closeContainer}
				disabled={closeContainer === undefined}
				menuIconProps={{ iconName: "Delete" }}
				aria-describedby={disposeContainerButtonTooltipId}
			/>
		</TooltipHost>
	);

	const itemStyles: IStackItemStyles = {
		root: {
			padding: "5px",
		},
	};

	return (
		<Stack horizontal>
			<StackItem styles={itemStyles}>{changeConnectionStateButton}</StackItem>
			<StackItem styles={itemStyles}>{disposeContainerButton}</StackItem>
		</Stack>
	);
}
