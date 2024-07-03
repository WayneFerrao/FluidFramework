/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	type DevtoolsFeatureFlags,
	DevtoolsFeatures,
} from "@fluidframework/devtools-core/internal";
// Normal usage pattern for @testing-library/jest-dom
// eslint-disable-next-line import/no-unassigned-import
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import React from "react";
// eslint-disable-next-line import/no-internal-modules
import { act } from "react-dom/test-utils";

import { MessageRelayContext } from "../MessageRelayContext.js";
import { TelemetryView } from "../components/index.js";

import { assertNoAccessibilityViolations, MockMessageRelay } from "./utils/index.js";

describe("TelemetryView Accessibility Check", () => {
	const supportedFeatures: DevtoolsFeatureFlags = {
		telemetry: true,
		opLatencyTelemetry: true,
	};
	const mockMessageRelay = new MockMessageRelay(() => {
		return {
			type: DevtoolsFeatures.MessageType,
			source: "MenuAccessibilityTest",
			data: {
				features: supportedFeatures,
				devtoolsVersion: "1.0.0",
				unsampledTelemetry: true,
			},
		};
	});
	it("TelemetryView is accessible", async () => {
		const { container } = render(
			<MessageRelayContext.Provider value={mockMessageRelay}>
				<TelemetryView />{" "}
			</MessageRelayContext.Provider>,
		);
		await assertNoAccessibilityViolations(container);
	});

	it("Can tab/arrow navigate through the TelemetryView", async () => {
		const { rerender } = render(
			<MessageRelayContext.Provider value={mockMessageRelay}>
				<TelemetryView />
			</MessageRelayContext.Provider>,
		);

		const user = userEvent.setup();
		await user.tab();
		const telemetryConsentButton = screen.getByRole("combobox", {
			name: /Max Events to Display/,
		});
		expect(telemetryConsentButton).toHaveFocus();
		await user.tab();
		const refreshButton = screen.getByRole("button", { name: /Refresh Telemetry/ });
		expect(refreshButton).toHaveFocus();

		mockMessageRelay.emit("message", {
			type: "TELEMETRY_EVENT",
			source: "fluid-client-devtools",
			data: {
				event: {
					category: "performance",
					logContent: {
						eventName: "fluid:telemetry:TestEvent",
					},
				},
			},
		});

		rerender(
			<MessageRelayContext.Provider value={mockMessageRelay}>
				<TelemetryView />
			</MessageRelayContext.Provider>,
		);

		await act(async () => userEvent.click(refreshButton));
		const filterCategory = screen.getByRole("combobox", {
			name: /Filter Category/,
		});
		await user.tab();
		expect(filterCategory).toHaveFocus();
		await user.tab();
		const eventNameFilter = screen.getByRole("combobox", { name: /Event Name Filter/ });
		expect(eventNameFilter).toHaveFocus();
	});
});
