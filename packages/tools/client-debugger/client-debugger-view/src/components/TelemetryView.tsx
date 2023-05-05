/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { IStackTokens, Stack, StackItem } from "@fluentui/react";
import {
	tokens,
	Combobox,
	ComboboxProps,
	DataGridBody,
	DataGridRow,
	DataGrid,
	DataGridHeader,
	DataGridHeaderCell,
	DataGridCell,
	Dropdown,
	DropdownProps,
	Option,
	TableColumnDefinition,
	createTableColumn,
} from "@fluentui/react-components";
import React, { useState, useRef } from "react";
import SplitPane from "react-split-pane";
import {
	GetTelemetryHistory,
	handleIncomingMessage,
	InboundHandlers,
	ISourcedDevtoolsMessage,
	ITimestampedTelemetryEvent,
	TelemetryHistory,
	TelemetryEvent,
} from "@fluid-tools/client-debugger";
import { useMessageRelay } from "../MessageRelayContext";
import { Waiting } from "./Waiting";

function mapEventCategoryToBackgroundColor(eventCategory: string): string {
	switch (eventCategory) {
		case "generic":
			return tokens.colorPaletteGreenForeground1;
		case "performance":
			return tokens.colorPaletteBlueForeground2;
		case "error":
			return tokens.colorPaletteRedBackground3;
		default:
			return tokens.colorNeutralBackground1;
	}
}

/**
 * Set the default displayed size to 100.
 */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Displays telemetry events generated by FluidFramework in the application.
 */
export function TelemetryView(): React.ReactElement {
	const messageRelay = useMessageRelay();
	const [telemetryEvents, setTelemetryEvents] = React.useState<
		ITimestampedTelemetryEvent[] | undefined
	>();
	const [maxEventsToDisplay, setMaxEventsToDisplay] = React.useState<number>(DEFAULT_PAGE_SIZE);

	React.useEffect(() => {
		/**
		 * Handlers for inbound messages related to telemetry.
		 */
		const inboundMessageHandlers: InboundHandlers = {
			[TelemetryEvent.MessageType]: (untypedMessage) => {
				const message = untypedMessage as TelemetryEvent.Message;
				setTelemetryEvents((currentEvents) => [
					message.data.event,
					...(currentEvents ?? []),
				]);
				return true;
			},
			[TelemetryHistory.MessageType]: (untypedMessage) => {
				const message = untypedMessage as TelemetryHistory.Message;
				setTelemetryEvents(message.data.contents);
				return true;
			},
		};

		// Event handler for messages coming from the Message Relay
		function messageHandler(message: Partial<ISourcedDevtoolsMessage>): void {
			handleIncomingMessage(message, inboundMessageHandlers);
		}

		messageRelay.on("message", messageHandler);

		// Request all log history
		messageRelay.postMessage(GetTelemetryHistory.createMessage());

		return (): void => {
			messageRelay.off("message", messageHandler);
		};
	}, [messageRelay, setTelemetryEvents]);

	return (
		<Stack>
			<StackItem>
				<ListLengthSelection
					currentLimit={maxEventsToDisplay}
					onChangeSelection={(key): void => setMaxEventsToDisplay(key)}
				/>
			</StackItem>
			<StackItem>
				{telemetryEvents !== undefined ? (
					<FilteredTelemetryView telemetryEvents={telemetryEvents} />
				) : (
					<Waiting label={"Waiting for Telemetry events"} />
				)}
			</StackItem>
		</Stack>
	);
}

/**
 * {@link ListLengthSelection} input props.
 */
interface ListLengthSelectionProps {
	/**
	 * The current limit (max number of telemetry events to show).
	 */
	currentLimit: number;

	/**
	 * Called when the selection changes.
	 */
	onChangeSelection(newLimit: number): void;
}

/**
 * A dropdown menu for selecting how many logs to display on the page.
 */
function ListLengthSelection(props: ListLengthSelectionProps): React.ReactElement {
	const { currentLimit, onChangeSelection } = props;
	const stackTokens: IStackTokens = { childrenGap: 20 };

	// Options formatted for the Fluent Dropdown component
	const dropdownOptions: { key: number; text: string }[] = [
		{ key: 50, text: "50" },
		{ key: 100, text: "100" },
		{ key: 500, text: "500" },
		{ key: 1000, text: "1000" },
	];

	const handleMaxEventChange: DropdownProps["onOptionSelect"] = (event, data) => {
		onChangeSelection(Number(data.optionText));
	};

	return (
		<Stack tokens={stackTokens}>
			<div style={{ marginLeft: "6px" }}>
				<h3>Max number of telemetry events to display: </h3>
				<Dropdown
					placeholder="Select an option"
					size="small"
					style={{ minWidth: "300px", zIndex: "1" }}
					defaultValue={currentLimit.toString()}
					// change the number of logs displayed on the page
					onOptionSelect={handleMaxEventChange}
				>
					{dropdownOptions.map((option) => {
						return (
							<Option style={{ minWidth: "120px" }} key={option.key}>
								{option.text}
							</Option>
						);
					})}
				</Dropdown>
			</div>
		</Stack>
	);
}

/**
 * {@link FilteredTelemetryView} input props.
 */
interface FilteredTelemetryViewProps {
	/**
	 * A list of all telemetry events received.
	 *
	 */
	telemetryEvents: ITimestampedTelemetryEvent[];
}

function FilteredTelemetryView(props: FilteredTelemetryViewProps): React.ReactElement {
	const { telemetryEvents } = props;
	const [selectedCategory, setSelectedCategory] = useState("");
	const [filteredTelemetryEvents, setFilteredTelemetryEvents] = React.useState<
		ITimestampedTelemetryEvent[] | undefined
	>();
	/**
	 * Used to store query for the searchable dropdown. The query is used to perform
	 * partial match searches and will display all events if query is an empty string.
	 */
	const [customSearch, setCustomSearch] = React.useState("");
	/**
	 * State holding a list of ALL unique event names.
	 * An empty list means no telemetry events have come in.
	 */
	const [eventNameOptions, setEventNameOptions] = useState<string[]>([]);
	/**
	 * State holding the event names matching the currently applied filter.
	 * Updated by the `onEventNameChange` handler
	 */
	const [matchingOptions, setMatchingOptions] = React.useState<string[]>([]);

	const [selectedEvent, setSelectedEvent] = React.useState<Item>();
	const eventNameOptionsRef = useRef<string[]>([]);
	React.useEffect(() => {
		eventNameOptionsRef.current = eventNameOptions;
	}, [eventNameOptions]);

	React.useEffect(() => {
		/**
		 * Filters all telemetry events based on category and event name
		 * @returns filtered list of events
		 */
		function getFilteredEvents(): ITimestampedTelemetryEvent[] | undefined {
			let filteredEvents = telemetryEvents;
			// Filter by category
			if (selectedCategory !== "" && selectedCategory !== "All") {
				filteredEvents = filteredEvents?.filter((event) => {
					return event.logContent.category === selectedCategory;
				});
			}
			// Filter by event name
			if (customSearch !== "") {
				filteredEvents = filteredEvents?.filter((event) => {
					return (
						event.logContent.eventName.slice("fluid:telemetry:".length) === customSearch
					);
				});
			}

			return filteredEvents ?? undefined;
		}

		// Create list of all event names
		setEventNameOptions([
			...new Set(
				telemetryEvents?.map((event) =>
					event.logContent.eventName.slice("fluid:telemetry:".length),
				),
			),
		]);
		// Initially matching options are all options
		setMatchingOptions(eventNameOptionsRef.current);

		const filtered = getFilteredEvents();
		setFilteredTelemetryEvents(filtered);
	}, [telemetryEvents, selectedCategory, customSearch]);

	/**
	 * Gets list of valid categories for displayed telemetry events.
	 * @returns list of option
	 */
	function getCategories(): { key: string; text: string }[] {
		const categories = [
			...new Set(filteredTelemetryEvents?.map((event) => event.logContent.category)),
		];
		const dropdownOptions = categories.map((category) => {
			return {
				key: category,
				text: category,
			};
		});
		dropdownOptions.push({ key: "All", text: "All" });
		return dropdownOptions.sort();
	}

	const handleCategoryChange: DropdownProps["onOptionSelect"] = (event, data) => {
		const category = data.optionText !== undefined ? data.optionText : "";
		setSelectedCategory(category);
	};

	/**
	 * Event handler that updates table to display events matching text in event name filter.
	 */
	const onEventNameChange: ComboboxProps["onChange"] = (event) => {
		const value = event.target.value.trim();
		const matches = eventNameOptions.filter((option) =>
			option.toLowerCase().includes(value.toLowerCase()),
		);
		setMatchingOptions(matches);
		if (value.length > 0 && matches.length === 0) {
			setCustomSearch(value);
		} else {
			setCustomSearch("");
		}
	};

	/**
	 * Handler for when user selects an option in event name filter.
	 */
	const handleEventNameSelect: ComboboxProps["onOptionSelect"] = (event, data) => {
		let matchingOption = false;
		if (data.optionText !== undefined) {
			matchingOption = eventNameOptions.includes(data.optionText);
		}
		if (matchingOption) {
			const search = data.optionText !== undefined ? data.optionText : "";
			setCustomSearch(search);
		} else {
			setCustomSearch("");
		}
	};

	/**
	 * Interface for each item in the telemetry table.
	 */
	interface Item {
		category: string;
		eventName: string;
		information: string;
	}

	const items: Item[] =
		filteredTelemetryEvents !== undefined
			? filteredTelemetryEvents?.map((message) => {
					return {
						category: message.logContent.category,
						eventName: message.logContent.eventName,
						information: JSON.stringify(message.logContent, undefined, 2),
					};
			  }, [])
			: [];

	const columns: TableColumnDefinition<Item>[] = [
		createTableColumn<Item>({
			columnId: "category",
			renderHeaderCell: () => {
				return (
					<div>
						<h2 style={{ margin: "0 0 5px 0" }}>Category</h2>
						<Dropdown
							placeholder="Filter Category"
							size="small"
							onOptionSelect={handleCategoryChange}
							style={{ minWidth: "120px", marginBottom: "10px" }}
						>
							{getCategories().map((option) => (
								<Option style={{ minWidth: "120px" }} key={option.key}>
									{option.text}
								</Option>
							))}
						</Dropdown>
					</div>
				);
			},
			renderCell: (message) => {
				return (
					<div
						style={{
							color: mapEventCategoryToBackgroundColor(message.category),
							fontWeight: 700,
							marginLeft: "5px",
						}}
					>
						{message.category}
					</div>
				);
			},
		}),
		createTableColumn<Item>({
			columnId: "eventName",
			renderHeaderCell: () => {
				return (
					<div>
						<h2 style={{ margin: "0 0 5px 0" }}>Event Name</h2>
						<Combobox
							freeform
							size="small"
							placeholder="Select an event"
							onChange={onEventNameChange}
							onOptionSelect={handleEventNameSelect}
							style={{marginBottom: "10px"}}
						>
							{customSearch ? (
								<Option
									key="freeform"
									style={{ overflowWrap: "anywhere" }}
									text={customSearch}
								>
									Search for `{customSearch}`
								</Option>
							) : undefined}
							{matchingOptions.map((option) => (
								<Option
									key={option}
									style={{ fontSize: "12px", overflowWrap: "anywhere" }}
								>
									{option}
								</Option>
							))}
						</Combobox>
					</div>
				);
			},
			renderCell: (message) => {
				return (
					<div>
						{/* Since all events start with "fluid:telemetry:", we trim the start of the name */}
						{message.eventName.slice("fluid:telemetry:".length)}
					</div>
				);
			},
		}),
	];

	return (
		<>
			<h3 style={{ marginLeft: "6px" }}>Telemetry events (newest first):</h3>
			<SplitPane
				split="vertical"
				minSize={580}
				style={{
					position: "relative",
					borderTop: `4px solid ${tokens.colorNeutralForeground2}`,
				}}
				pane2Style={{ margin: "10px" }}
				resizerStyle={{
					borderRight: `2px solid ${tokens.colorNeutralForeground2}`,
					borderLeft: `2px solid ${tokens.colorNeutralForeground2}`,
					zIndex: 1,
					cursor: "col-resize",
				}}
			>
				<DataGrid
					items={items}
					columns={columns}
					resizableColumns
					selectionMode="single"
					columnSizingOptions={{
						category: {
							minWidth: 120,
							idealWidth: 120,
						},
						eventName: {
							minWidth: 375,
							idealWidth: 375,
						},
					}}
				>
					<DataGridHeader>
						<DataGridRow style={{ whiteSpace: "normal" }}>
							{({ renderHeaderCell }): JSX.Element => (
								<DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
							)}
						</DataGridRow>
					</DataGridHeader>
					<DataGridBody<Item>>
						{({ item, rowId }): JSX.Element => (
							<DataGridRow<Item>
								key={rowId}
								style={{ cursor: "pointer" }}
								onClick={(): void => {
									setSelectedEvent(item);
								}}
							>
								{({ renderCell }): JSX.Element => (
									<DataGridCell>{renderCell(item)}</DataGridCell>
								)}
							</DataGridRow>
						)}
					</DataGridBody>
				</DataGrid>
				<div
					style={{
						position: "relative",
						height: "100%",
					}}
				>
					<h1 style={{ margin: 0 }}>Event Information</h1>
					{selectedEvent === undefined ? (
						<h3>Select an event from the table to get started</h3>
					) : (
						<pre> {selectedEvent?.information} </pre>
					)}
				</div>
			</SplitPane>
		</>
	);
}
