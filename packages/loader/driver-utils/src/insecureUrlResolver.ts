/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { parse } from "url";
import { assert } from "@fluidframework/core-utils";
import { IRequest } from "@fluidframework/core-interfaces";
import { IResolvedUrl, IUrlResolver, DriverHeader } from "@fluidframework/driver-definitions";
import Axios from "axios";

/**
 * As the name implies this is not secure and should not be used in production. It simply makes the example easier
 * to get up and running.
 *
 * In our example we run a simple web server via webpack-dev-server. This defines a URL format of the form
 * http://localhost:8080/<documentId>/<path>.
 *
 * We then need to map that to a Fluid based URL. These are of the form
 * fluid://orderingUrl/<tenantId>/<documentId>/<path>.
 *
 * The tenantId/documentId pair defines the 'full' document ID the service makes use of. The path is then an optional
 * part of the URL that the document interprets and maps to a data store. It's exactly similar to how a web service
 * works or a router inside of a single page app framework.
 * @public
 */
export class InsecureUrlResolver implements IUrlResolver {
	private readonly cache = new Map<string, Promise<IResolvedUrl>>();

	constructor(
		private readonly hostUrl: string,
		private readonly ordererUrl: string,
		private readonly storageUrl: string,
		private readonly tenantId: string,
		private readonly bearer: string,
		private readonly isForNodeTest: boolean = false,
	) {}

	public async resolve(request: IRequest): Promise<IResolvedUrl | undefined> {
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (request.headers?.[DriverHeader.createNew]) {
			const [, queryString] = request.url.split("?");
			const searchParams = new URLSearchParams(queryString);
			const fileName = searchParams.get("fileName");
			return this.resolveHelper(fileName);
		}
		const parsedUrl = new URL(request.url);
		// If hosts match then we use the local tenant information. Otherwise we make a REST call out to the hosting
		// service using our bearer token.
		if (this.isForNodeTest) {
			const [, documentId, tmpRelativePath] = parsedUrl.pathname.substr(1).split("/");
			const relativePath = tmpRelativePath ?? "";
			return this.resolveHelper(documentId, relativePath, parsedUrl.search);
		} else if (parsedUrl.host === window.location.host) {
			const fullPath = parsedUrl.pathname.substr(1);
			const documentId = fullPath.split("/")[0];
			const documentRelativePath = fullPath.slice(documentId.length);
			return this.resolveHelper(documentId, documentRelativePath);
		} else {
			const maybeResolvedUrl = this.cache.get(request.url);
			if (maybeResolvedUrl) {
				return maybeResolvedUrl;
			}

			const headers = {
				Authorization: `Bearer ${this.bearer}`,
			};
			const resolvedP = Axios.post<IResolvedUrl>(
				`${this.hostUrl}/api/v1/load`,
				{
					url: request.url,
				},
				{
					headers,
				},
			);
			this.cache.set(
				request.url,
				resolvedP.then((resolved) => resolved.data),
			);

			return this.cache.get(request.url);
		}
	}

	private resolveHelper(
		documentId: string | null,
		documentRelativePath: string = "",
		queryParams: string = "",
	) {
		const encodedTenantId = encodeURIComponent(this.tenantId);
		const host = new URL(this.ordererUrl).host;
		// when the document ID is not provided we need to resolve a special create new document URL.
		// the actual container ID will be generated by the driver.
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!documentId) {
			const createNewResponse: IResolvedUrl = {
				endpoints: {
					deltaStorageUrl: `${this.ordererUrl}/deltas/${encodedTenantId}/new`,
					ordererUrl: this.ordererUrl,
					storageUrl: `${this.storageUrl}/repos/${encodedTenantId}`,
				},
				// document ID is ignored by the driver for new container requests
				id: "",
				tokens: {},
				type: "fluid",
				url: `fluid://${host}/${encodedTenantId}/new`,
			};
			return createNewResponse;
		}
		const encodedDocId = encodeURIComponent(documentId);
		const relativePath =
			!documentRelativePath || documentRelativePath.startsWith("/")
				? documentRelativePath
				: `/${documentRelativePath}`;
		const documentUrl = `fluid://${host}/${encodedTenantId}/${encodedDocId}${relativePath}${queryParams}`;

		const deltaStorageUrl = `${this.ordererUrl}/deltas/${encodedTenantId}/${encodedDocId}`;
		const storageUrl = `${this.storageUrl}/repos/${encodedTenantId}`;

		const response: IResolvedUrl = {
			endpoints: {
				deltaStorageUrl,
				ordererUrl: this.ordererUrl,
				storageUrl,
			},
			id: documentId,
			tokens: {},
			type: "fluid",
			url: documentUrl,
		};
		return response;
	}

	public async getAbsoluteUrl(resolvedUrl: IResolvedUrl, relativeUrl: string): Promise<string> {
		const parsedUrl = parse(resolvedUrl.url);
		const [, , documentId] = parsedUrl.pathname?.split("/") ?? [];
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		assert(!!documentId, 0x273 /* "Invalid document id from parsed URL" */);

		let url = relativeUrl;
		if (url.startsWith("/")) {
			url = url.substr(1);
		}

		return `${this.hostUrl}/${encodeURIComponent(this.tenantId)}/${encodeURIComponent(
			documentId,
		)}/${url}`;
	}

	public createCreateNewRequest(fileName?: string): IRequest {
		const createNewRequest: IRequest = {
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			url: fileName ? `${this.hostUrl}?fileName=${fileName}` : this.hostUrl,
			headers: {
				[DriverHeader.createNew]: true,
			},
		};
		return createNewRequest;
	}
}
