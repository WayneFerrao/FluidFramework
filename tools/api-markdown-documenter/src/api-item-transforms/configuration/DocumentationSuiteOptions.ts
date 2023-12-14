/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { Utilities } from "@microsoft/api-documenter/lib/utils/Utilities";
import {
	type ApiDeclaredItem,
	type ApiItem,
	ApiItemKind,
	type ApiPackage,
	type Excerpt,
	ReleaseTag,
} from "@microsoft/api-extractor-model";

import {
	type ApiMemberKind,
	getQualifiedApiItemName,
	getReleaseTag,
	getUnscopedPackageName,
	releaseTagToString,
} from "../../utilities";

/**
 * List of item kinds for which separate documents should be generated.
 * Items specified will be rendered to their own documents.
 * Items not specified will be rendered into their parent's contents.
 *
 * @remarks Note that `Model` and `Package` items will *always* have separate documents generated for them, even if
 * not specified.
 *
 * Also note that `EntryPoint` items will always be ignored by the system, even if specified here.
 *
 * @example
 *
 * A configuration like the following:
 *
 * ```typescript
 * ...
 * documentBoundaries: [
 *  ApiItemKind.Namespace,
 * ],
 * ...
 * ```
 *
 * will result in separate documents being generated for `Namespace` items, but will not for other item kinds
 * (`Classes`, `Interfaces`, etc.).
 *
 * @public
 */
export type DocumentBoundaries = ApiMemberKind[];

/**
 * List of item kinds for which sub-directories will be generated, and under which child item documents will be created.
 * If not specified for an item kind, any children of items of that kind will be generated adjacent to the parent.
 *
 * @remarks Note that `Package` items will *always* have separate documents generated for them, even if
 * not specified.
 *
 * @example
 *
 * A configuration like the following:
 *
 * ```typescript
 * ...
 * hierarchyBoundaries: [
 *  ApiItemKind.Namespace,
 * ],
 * ...
 * ```
 *
 * will result in documents rendered for children of the `Namespace` to be generated in a subdirectory named after
 * the `Namespace` item.
 *
 * So for some namespace `Foo` with children `Bar` and `Baz` (assuming `Bar` and `Baz` are item kinds matching
 * the configured {@link DocumentationSuiteOptions.documentBoundaries}), the resulting file structure would look like the
 * following:
 *
 * ```
 * foo.md
 * foo
 *  | bar.md
 *  | baz.md
 * ```
 *
 * @public
 */
export type HierarchyBoundaries = ApiMemberKind[];

/**
 * Options for configuring the documentation suite generated by the API Item -\> Documentation Domain transformation.
 *
 * @public
 */
export interface DocumentationSuiteOptions {
	/**
	 * Whether or not to include a top-level heading in rendered documents.
	 *
	 * @defaultValue `true`
	 *
	 * @remarks If you will be rendering the document contents into some other document content that will inject its
	 * own root heading, this can be used to omit that heading from what is rendered by this system.
	 */
	includeTopLevelDocumentHeading?: boolean;

	/**
	 * Whether or not to include a navigation breadcrumb at the top of rendered documents.
	 *
	 * @defaultValue `true`
	 *
	 * @remarks Note: `Model` items will never have a breadcrumb rendered, even if this is specfied.
	 */
	includeBreadcrumb?: boolean;

	/**
	 * See {@link DocumentBoundaries}.
	 *
	 * @defaultValue {@link DefaultDocumentationSuiteOptions.defaultDocumentBoundaries}
	 */
	documentBoundaries?: DocumentBoundaries;

	/**
	 * See {@link HierarchyBoundaries}.
	 *
	 * @defaultValue {@link DefaultDocumentationSuiteOptions.defaultHierarchyBoundaries}
	 */
	hierarchyBoundaries?: HierarchyBoundaries;

	/**
	 * Generate a file name for the provided `ApiItem`.
	 *
	 * @remarks
	 *
	 * Note that this is not the complete file name, but the "leaf" component of the final file name.
	 * Additional prefixes and suffixes will be appended to ensure file name collisions do not occur.
	 *
	 * This also does not contain the file extension.
	 *
	 * @example
	 *
	 * We are given a class API item "Bar" in package "Foo", and this returns "foo".
	 * The final file name in this case might be something like "foo-bar-class".
	 *
	 * @param apiItem - The API item for which the pre-modification file name is being generated.
	 *
	 * @returns The pre-modification file name for the API item.
	 *
	 * @defaultValue {@link DefaultDocumentationSuiteOptions.defaultGetFileNameForItem}
	 */
	getFileNameForItem?: (apiItem: ApiItem) => string;

	/**
	 * Optionally provide an override for the URI base used in links generated for the provided `ApiItem`.
	 *
	 * @remarks
	 *
	 * This can be used to match on particular item kinds, package names, etc., and adjust the links generated
	 * in the documentation accordingly.
	 *
	 * @param apiItem - The API item in question.
	 *
	 * @returns The URI base to use for the API item, or undefined if the default base should be used.
	 *
	 * @defaultValue Always use the default URI base.
	 */
	getUriBaseOverrideForItem?: (apiItem: ApiItem) => string | undefined;

	/**
	 * Generate heading text for the provided `ApiItem`.
	 *
	 * @param apiItem - The API item for which the heading is being generated.
	 *
	 * @returns The heading title for the API item.
	 *
	 * @defaultValue {@link DefaultDocumentationSuiteOptions.defaultGetHeadingTextForItem}
	 */
	getHeadingTextForItem?: (apiItem: ApiItem) => string;

	/**
	 * Generate link text for the provided `ApiItem`.
	 *
	 * @param apiItem - The API item for which the link is being generated.
	 *
	 * @returns The text to use in the link to the API item.
	 *
	 * @defaultValue {@link DefaultDocumentationSuiteOptions.defaultGetLinkTextForItem}
	 */
	getLinkTextForItem?: (apiItem: ApiItem) => string;

	/**
	 * Whether or not the provided `ApiPackage` should be skipped during documentation generation.
	 *
	 * @param apiPackage - The package that may or may not be skipped.
	 *
	 * @returns
	 *
	 * `true` if the package should not be included documentation generation. `false` otherwise.
	 *
	 * @defaultValue No packages are skipped.
	 */
	skipPackage?: (apiPackage: ApiPackage) => boolean;

	/**
	 * Optionally generates front-matter contents for an `ApiItem` serving as the root of a document
	 * (see {@link DocumentBoundaries}).
	 * Any generated contents will be included at the top of a generated document.
	 *
	 * @remarks Note: this is arbitrary text, and will not be escaped.
	 *
	 * @defaultValue No front matter is generated.
	 */
	frontMatter?: string | ((documentItem: ApiItem) => string | undefined);

	/**
	 * Minimal release scope to include in generated documentation suite.
	 * API members with matching or higher scope will be included, while lower scoped items will be omitted.
	 *
	 * @remarks
	 *
	 * Note that items tagged as `@internal` are not included in the models generated by API-Extractor,
	 * so `@internal` items will never be included for such models.
	 *
	 * Hierarchy: `@public` \> `@beta` \> `@alpha` \> `@internal`
	 *
	 * @defaultValue Include everything in the input model.
	 *
	 * @example `@beta` and `@public`
	 *
	 * To only include `@beta` and `@public` items (and omit `@alpha` items), specify:
	 *
	 * ```typescript
	 * releaseLevel: ReleaseTag.Beta
	 * ```
	 */
	minimumReleaseLevel?: Omit<ReleaseTag, ReleaseTag.None>;
}

/**
 * Contains a list of default documentation transformations, used by {@link DocumentationSuiteOptions}.
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DefaultDocumentationSuiteOptions {
	/**
	 * Default {@link DocumentationSuiteOptions.documentBoundaries}.
	 *
	 * Generates separate documents for the following API item kinds:
	 *
	 * - Class
	 *
	 * - Interface
	 *
	 * - Namespace
	 */
	export const defaultDocumentBoundaries: ApiMemberKind[] = [
		ApiItemKind.Class,
		ApiItemKind.Interface,
		ApiItemKind.Namespace,
	];

	/**
	 * Default {@link DocumentationSuiteOptions.hierarchyBoundaries}.
	 *
	 * Creates sub-directories for the following API item kinds:
	 *
	 * - Namespace
	 */
	export const defaultHierarchyBoundaries: ApiMemberKind[] = [ApiItemKind.Namespace];

	/**
	 * Default {@link DocumentationSuiteOptions.getFileNameForItem}.
	 *
	 * Uses the item's qualified API name, but is handled differently for the following items:
	 *
	 * - Model: Uses "index".
	 *
	 * - Package: Uses the unscoped package name.
	 */
	export function defaultGetFileNameForItem(apiItem: ApiItem): string {
		switch (apiItem.kind) {
			case ApiItemKind.Model: {
				return "index";
			}
			case ApiItemKind.Package: {
				return Utilities.getSafeFilenameForName(
					getUnscopedPackageName(apiItem as ApiPackage),
				);
			}
			default: {
				return getQualifiedApiItemName(apiItem);
			}
		}
	}

	/**
	 * Default {@link DocumentationSuiteOptions.getUriBaseOverrideForItem}.
	 *
	 * Always uses default URI base.
	 */
	export function defaultGetUriBaseOverrideForItem(): string | undefined {
		return undefined;
	}

	/**
	 * Default {@link DocumentationSuiteOptions.getHeadingTextForItem}.
	 *
	 * Uses the item's `displayName`, except for `Model` items, in which case the text "API Overview" is displayed.
	 */
	export function defaultGetHeadingTextForItem(apiItem: ApiItem): string {
		// If the API is `@alpha` or `@beta`, append a notice to the heading text
		const releaseTag = getReleaseTag(apiItem);
		const headingTextPostfix =
			releaseTag === ReleaseTag.Alpha || releaseTag === ReleaseTag.Beta
				? ` (${releaseTagToString(releaseTag).toUpperCase()})`
				: "";

		switch (apiItem.kind) {
			case ApiItemKind.Model: {
				return "API Overview";
			}
			case ApiItemKind.CallSignature:
			case ApiItemKind.ConstructSignature:
			case ApiItemKind.IndexSignature: {
				// For signature items, the display-name is not particularly useful information
				// ("(constructor)", "(call)", etc.).
				// Instead, we will use a cleaned up variation on the type signature.
				const excerpt = getSingleLineExcerptText((apiItem as ApiDeclaredItem).excerpt);
				return `${excerpt}${headingTextPostfix}`;
			}
			default: {
				return `${apiItem.displayName}${headingTextPostfix}`;
			}
		}
	}

	/**
	 * Default {@link DocumentationSuiteOptions.getLinkTextForItem}.
	 *
	 * Uses the item's signature, except for `Model` items, in which case the text "Packages" is displayed.
	 */
	export function defaultGetLinkTextForItem(apiItem: ApiItem): string {
		switch (apiItem.kind) {
			case ApiItemKind.Model: {
				return "Packages";
			}
			case ApiItemKind.CallSignature:
			case ApiItemKind.ConstructSignature:
			case ApiItemKind.IndexSignature: {
				// For signature items, the display-name is not particularly useful information
				// ("(constructor)", "(call)", etc.).
				// Instead, we will use a cleaned up variation on the type signature.
				return getSingleLineExcerptText((apiItem as ApiDeclaredItem).excerpt);
			}
			default: {
				return Utilities.getConciseSignature(apiItem);
			}
		}
	}

	/**
	 * Default {@link DocumentationSuiteOptions.skipPackage}.
	 *
	 * Unconditionally returns `false` (i.e. no packages will be filtered out).
	 */
	export function defaultSkipPackage(): boolean {
		return false;
	}

	/**
	 * Default {@link DocumentationSuiteOptions.frontMatter}.
	 *
	 * Unconditionally returns `undefined` (i.e. no front-matter will be generated).
	 */
	export function defaultFrontMatter(): undefined {
		return undefined;
	}
}

/**
 * Default {@link DocumentationSuiteOptions} value.
 */
const defaultDocumentationSuiteOptions: Required<DocumentationSuiteOptions> = {
	includeTopLevelDocumentHeading: true,
	includeBreadcrumb: true,
	documentBoundaries: DefaultDocumentationSuiteOptions.defaultDocumentBoundaries,
	hierarchyBoundaries: DefaultDocumentationSuiteOptions.defaultHierarchyBoundaries,
	getFileNameForItem: DefaultDocumentationSuiteOptions.defaultGetFileNameForItem,
	getUriBaseOverrideForItem: DefaultDocumentationSuiteOptions.defaultGetUriBaseOverrideForItem,
	getHeadingTextForItem: DefaultDocumentationSuiteOptions.defaultGetHeadingTextForItem,
	getLinkTextForItem: DefaultDocumentationSuiteOptions.defaultGetLinkTextForItem,
	skipPackage: DefaultDocumentationSuiteOptions.defaultSkipPackage,
	frontMatter: DefaultDocumentationSuiteOptions.defaultFrontMatter,
	minimumReleaseLevel: ReleaseTag.Internal, // Include everything in the input model
};

/**
 * Extracts the text from the provided excerpt and adjusts it to be on a single line, and to omit any trailing `;`.
 *
 * @privateRemarks If we find that this is useful in more places, we might consider moving this to a
 * public utilities module and make it part of the public helper suite.
 */
function getSingleLineExcerptText(excerpt: Excerpt): string {
	// Regex replaces line breaks with spaces to ensure everything ends up on a single line.
	let signatureExcerpt = excerpt.text.trim().replace(/\s+/g, " ");

	if (signatureExcerpt.endsWith(";")) {
		signatureExcerpt = signatureExcerpt.slice(0, signatureExcerpt.length - 1);
	}

	return signatureExcerpt;
}

/**
 * Gets a complete {@link DocumentationSuiteOptions} using the provided partial configuration, and filling
 * in the remainder with the documented defaults.
 */
export function getDocumentationSuiteOptionsWithDefaults(
	inputOptions: DocumentationSuiteOptions,
): Required<DocumentationSuiteOptions> {
	return {
		...defaultDocumentationSuiteOptions,
		...inputOptions,
	};
}
