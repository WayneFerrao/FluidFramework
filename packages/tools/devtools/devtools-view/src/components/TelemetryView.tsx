/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	Button,
	Combobox,
	ComboboxProps,
	CounterBadge,
	createTableColumn,
	DataGrid,
	DataGridBody,
	DataGridCell,
	DataGridHeader,
	DataGridHeaderCell,
	DataGridRow,
	Dropdown,
	DropdownProps,
	makeStyles,
	Option,
	shorthands,
	TableColumnDefinition,
	tokens,
} from "@fluentui/react-components";
import React, { useState, useRef } from "react";
import SplitPane from "react-split-pane";
import {
	DevtoolsDisposed,
	GetTelemetryHistory,
	handleIncomingMessage,
	InboundHandlers,
	ISourcedDevtoolsMessage,
	ITimestampedTelemetryEvent,
	TelemetryHistory,
	TelemetryEvent,
} from "@fluid-experimental/devtools-core";
import { useMessageRelay } from "../MessageRelayContext";
import { useLogger } from "../TelemetryUtils";
import { ThemeContext } from "../ThemeHelper";
import { Waiting } from "./Waiting";

/**
 * Set the default displayed size to 100.
 */
const DEFAULT_PAGE_SIZE = 100;

const useTelemetryViewStyles = makeStyles({
	root: {
		...shorthands.gap("10px"),
		boxSizing: "border-box",
		alignItems: "start",
		display: "flex",
		flexDirection: "column",
		height: "100%",
		width: "100%",
	},
	menu: {
		...shorthands.gap("5px"),
		display: "flex",
		flexDirection: "row",
	},
});

/**
 * Displays telemetry events generated by FluidFramework in the application.
 */
export function TelemetryView(): React.ReactElement {
	const messageRelay = useMessageRelay();
	const usageLogger = useLogger();

	const styles = useTelemetryViewStyles();

	const [telemetryEvents, setTelemetryEvents] = React.useState<
		ITimestampedTelemetryEvent[] | undefined
	>();

	/**
	 * The inboundMessageHandlers update `bufferedEvents` with incoming events.
	 * If `telemetryEvents` has not reached its capacity (`maxEventsToDisplay`),
	 * `bufferedEvents` transfers events to `telemetryEvents` in a FIFO (First In First Out) manner.
	 * If `telemetryEvents` is full, new events accumulate in `bufferedEvents` until more space becomes available.
	 */
	const [bufferedEvents, setBufferedEvents] = React.useState<ITimestampedTelemetryEvent[]>([]);
	const [maxEventsToDisplay, setMaxEventsToDisplay] = React.useState<number>(DEFAULT_PAGE_SIZE);
	const [selectedIndex, setSelectedIndex] = React.useState<number | undefined>();

	React.useEffect(() => {
		/**
		 * Handlers for inbound messages related to telemetry.
		 */
		const inboundMessageHandlers: InboundHandlers = {
			[TelemetryEvent.MessageType]: async (untypedMessage) => {
				const message = untypedMessage as TelemetryEvent.Message;
				setBufferedEvents((currentBuffer) => [
					message.data.event,
					...(currentBuffer ?? []),
				]);
				return true;
			},
			[TelemetryHistory.MessageType]: async (untypedMessage) => {
				const message = untypedMessage as TelemetryHistory.Message;
				setTelemetryEvents(message.data.contents);
				return true;
			},
			[DevtoolsDisposed.MessageType]: async (untypedMessage) => {
				// Require latest feature state to ensure we aren't displaying stale data
				setBufferedEvents([]);
				setTelemetryEvents([]);
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

	React.useEffect(() => {
		if (
			telemetryEvents &&
			bufferedEvents.length > 0 &&
			telemetryEvents.length < maxEventsToDisplay
		) {
			const newEvents = bufferedEvents.slice(0, maxEventsToDisplay - telemetryEvents.length);
			const remainingBuffer = bufferedEvents.slice(
				maxEventsToDisplay - telemetryEvents.length,
			);
			setTelemetryEvents([...newEvents, ...telemetryEvents]);
			setSelectedIndex((prevIndex) => {
				if (prevIndex !== undefined) {
					return prevIndex + newEvents.length;
				}
			});
			setBufferedEvents(remainingBuffer);
		}
	}, [telemetryEvents, bufferedEvents, maxEventsToDisplay, selectedIndex]);

	const handleLoadMore = (): void => {
		const newEvents =
			bufferedEvents.length > maxEventsToDisplay
				? bufferedEvents.slice(0, maxEventsToDisplay)
				: [...bufferedEvents];

		// Add new events to telemetryEvents
		let refreshedList = [...newEvents, ...(telemetryEvents ?? [])];
		// If the length of telemetryEvents exceeds maxEventsToDisplay, truncate oldest events
		if (refreshedList.length > maxEventsToDisplay) {
			refreshedList = refreshedList.slice(0, maxEventsToDisplay);
		}
		setTelemetryEvents(refreshedList);
		setSelectedIndex((prevIndex) => {
			if (prevIndex !== undefined) {
				return prevIndex + newEvents.length;
			}
		});
		// Update bufferedEvents to remove the events just moved to telemetryEvents
		const remainingBuffer = bufferedEvents.slice(newEvents.length);
		setBufferedEvents(remainingBuffer);
		usageLogger?.sendTelemetryEvent({ eventName: "RefreshTelemetryButtonClicked" });
	};

	return (
		<div className={styles.root}>
			<ListLengthSelection
				currentLimit={maxEventsToDisplay}
				onChangeSelection={(key): void => setMaxEventsToDisplay(key)}
			/>
			<div className={styles.menu}>
				<div>
					{bufferedEvents.length > 0 ? (
						<>
							<CounterBadge size="large" color="brand">
								{bufferedEvents.length < 100 ? bufferedEvents.length : "100+"}
							</CounterBadge>
							<> {` Newer telemetry events received.`}</>
						</>
					) : (
						<> {`You're up to date!`} </>
					)}
				</div>
				<div>
					<Button onClick={handleLoadMore} size="small">
						Refresh
					</Button>
				</div>
			</div>
			{telemetryEvents !== undefined ? (
				<FilteredTelemetryView
					telemetryEvents={telemetryEvents}
					setIndex={setSelectedIndex}
					index={selectedIndex}
				/>
			) : (
				<Waiting label={"Waiting for Telemetry events"} />
			)}
		</div>
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
	const usageLogger = useLogger();

	// Options formatted for the Fluent Dropdown component
	const dropdownOptions: { key: number; text: string }[] = [
		{ key: 50, text: "50" },
		{ key: 100, text: "100" },
		{ key: 500, text: "500" },
		{ key: 1000, text: "1000" },
	];

	const handleMaxEventChange: DropdownProps["onOptionSelect"] = (event, data) => {
		onChangeSelection(Number(data.optionText));
		usageLogger?.sendTelemetryEvent({
			eventName: "MaxTelemetryEventsUpdated",
			details: {
				maxEvents: data.optionText,
			},
		});
	};

	return (
		<div>
			Show &nbsp;
			<Dropdown
				placeholder="Select an option"
				size="small"
				style={{ minWidth: "30px", zIndex: "1" }}
				defaultValue={currentLimit.toString()}
				// change the number of logs displayed on the page
				onOptionSelect={handleMaxEventChange}
			>
				{dropdownOptions.map((option) => {
					return (
						<Option style={{ minWidth: "30px" }} key={option.key}>
							{option.text}
						</Option>
					);
				})}
			</Dropdown>
		</div>
	);
}

/**
 * {@link FilteredTelemetryView} input props.
 */
interface FilteredTelemetryViewProps {
	/**
	 * A list of all telemetry events received.
	 */
	telemetryEvents: ITimestampedTelemetryEvent[];
	/**
	 * A setter use to update the selected row when filtering or refreshing event data.
	 */
	setIndex: React.Dispatch<React.SetStateAction<number | undefined>>;

	/**
	 * The selected index/row in the table. Undefined means no row is selected.
	 */
	index: number | undefined;
}

function FilteredTelemetryView(props: FilteredTelemetryViewProps): React.ReactElement {
	const { telemetryEvents, setIndex, index } = props;
	const usageLogger = useLogger();
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
	const { themeInfo } = React.useContext(ThemeContext) ?? {};
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
		if (filtered !== undefined && index !== undefined) {
			setIndex(index + (telemetryEvents.length - filtered?.length));
		}
	}, [telemetryEvents, selectedCategory, customSearch, index, setIndex]);

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
		const categories: string[] = [];
		categories.push(category);
		usageLogger?.sendTelemetryEvent({
			eventName: "TelemetryEventCategoryChanged",
			details: {
				categories,
			},
		});
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
	 * Sets the color of the event category text.
	 * @param eventCategory - a string representing
	 * @returns string representing the appropriate color
	 */
	const mapEventCategoryToBackgroundColor = (eventCategory: string): string | undefined => {
		if (themeInfo?.name !== "highContrast") {
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
			usageLogger?.sendTelemetryEvent({
				eventName: "TelemetryEventNameFilter",
				details: {
					eventNames: [search],
				},
			});
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
						<h4 style={{ margin: "0 0 5px 0" }}>Category</h4>
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
						<h4 style={{ margin: "0 0 5px 0" }}>Event</h4>
						<Combobox
							freeform
							size="small"
							placeholder="Select an event"
							onChange={onEventNameChange}
							onOptionSelect={handleEventNameSelect}
							style={{ marginBottom: "10px" }}
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
									style={{ fontSize: "10px", overflowWrap: "anywhere" }}
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
		<SplitPane
			split="vertical"
			minSize={540}
			style={{
				position: "relative",
				borderTop: `4px solid ${tokens.colorNeutralForeground2}`,
				paddingTop: "10px",
				width: "100%",
				overflowX: "scroll",
			}}
			pane1Style={{ overflowY: "auto" }}
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
				size="extra-small"
				resizableColumns
				selectionMode="single"
				subtleSelection
				selectedItems={index !== undefined && index >= 0 ? [index] : []}
				columnSizingOptions={{
					category: {
						minWidth: 110,
						idealWidth: 110,
					},
					eventName: {
						minWidth: 330,
						idealWidth: 330,
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
								setIndex(Number(rowId));
								setSelectedEvent(item);
								usageLogger?.sendTelemetryEvent({
									eventName: "TelemetryEventClicked",
									details: {
										telemetryEventName: item.eventName,
									},
								});
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
				<h4 style={{ margin: 0, fontSize: 14 }}>Event Information</h4>
				{selectedEvent === undefined ? (
					"Select an event from the table to get started"
				) : (
					<pre> {selectedEvent?.information} </pre>
				)}
			</div>
		</SplitPane>
	);
}
