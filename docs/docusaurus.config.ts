/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import * as Preset from "@docusaurus/preset-classic";
import type { VersionOptions } from "@docusaurus/plugin-content-docs";

import DocsVersions from "./config/docs-versions.mjs";
import GeneratedApiVersions from "./api-docs-build-manifest.json" assert { type: "json" };; // Generated by API docs build

const githubUrl = "https://github.com/microsoft/FluidFramework";

// TODO: set back to main before merging
const githubMainBranchUrl = `${githubUrl}/tree/dev/docs/docusaurus`;
const githubDocsUrl = `${githubMainBranchUrl}/docs`;

// #region Generate the Docusaurus versions from our versions config.

const versionsConfig: {[versionName: string]: VersionOptions} = {
	current: {
		label: DocsVersions.currentVersion.label,
		badge: false,
	},
}

for (const version of DocsVersions.otherVersions) {
	versionsConfig[version.version] = {
		label: version.label,
		path: version.path,
		badge: true,
	}
}

// If we generated local API docs, add a version for them here so Docusaurus will include them in the build.
if (GeneratedApiVersions.apiDocsVersions.includes("local")) {
	versionsConfig[DocsVersions.local.version] = {
		label: DocsVersions.local.label,
		path: DocsVersions.local.path,
		badge: true,
	}
}

// #endregion

const config: Config = {
	title: "Fluid Framework Documentation",
	// tagline: "TODO",
	favicon: "assets/fluid-icon.svg",

	// Set the production url of your site here
	url: "https://fluidframework.com/",
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: "/",

	// Reports many false positives for API documentation
	onBrokenAnchors: "ignore",
	onBrokenLinks: "warn",
	onBrokenMarkdownLinks: "throw",
	onDuplicateRoutes: "throw",

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},
	plugins: [
		// https://github.com/praveenn77/docusaurus-lunr-search
		"docusaurus-lunr-search",
		"docusaurus-plugin-sass",
	],
	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					lastVersion: "current",
					includeCurrentVersion: true,
					versions: versionsConfig,
					// Determines whether or not to display an "Edit this page" link at
					// the bottom of each page.
					editUrl: ({version, versionDocsDirPath, docPath, permalink, locale})=> {
						// If the doc is a generated API document, don't display edit link.
						if (docPath.startsWith("api/")) {
							return undefined;
						}
						return `${githubDocsUrl}/${versionDocsDirPath}${docPath}`;
					},
				},
				// We can add support for blog posts in the future.
				blog: undefined,
				theme: {
					customCss: [
						"./src/css/custom.scss",
						"./src/css/typography.scss",
					],
				},
			} satisfies Preset.Options,
		],
	],
	markdown: {
		// `.mdx` files will be treated as MDX, and `.md` files will be treated as standard Markdown.
		// Needed to support current API docs output, which is not MDX compatible.
		format: "detect",
		mermaid: true,
	},
	themeConfig: {
		// // Replace with your project's social card
		// image: "TODO",

		colorMode: {
			// Default to user's browser preference
			respectPrefersColorScheme: true,
		},

		// Temp announcement bar announcing Fluid v2.
		// announcementBar: {
		// 	id: "fluid-2-announcement",
		// 	content: "🎉 Fluid Framework 2 is now in General Availability! <a target=\"_blank\" href=\"https://aka.ms/fluid/release_blog\">Learn more</a>.",
		// 	isCloseable: true,
		// },

		// Top nav-bar
		navbar: {
			title: "Fluid Framework",
			logo: {
				alt: "Fluid Framework Logo",
				src: "assets/fluid-icon.svg",
			},
			items: [
				{
					type: 'docsVersionDropdown',
					position: 'left',
					dropdownActiveClassDisabled: true,
				},
				{
					type: "docSidebar",
					sidebarId: "docsSidebar",
					position: "left",
					label: "Docs",
				},
				{ to: "/community", label: "Community", position: "left" },
				{ to: "/support", label: "Support", position: "left" },
			],
		},
		// Note: we have configured a custom footer component. See src/theme/Footer/index.tsx.
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
	themes: ["@docusaurus/theme-mermaid"],
};

export default config;
