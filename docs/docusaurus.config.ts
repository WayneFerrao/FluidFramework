/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const githubUrl = "https://github.com/microsoft/FluidFramework";

const config: Config = {
	title: "Fluid Framework Documentation",
	// tagline: "TODO",
	favicon: "img/logo.png",

	// Set the production url of your site here
	url: "https://fluidframework.com/",
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: "/",

	onBrokenAnchors: "ignore", // TODO: plugin that supports our anchor syntax
	onBrokenLinks: "warn",
	onBrokenMarkdownLinks: "warn",
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
					versions: {
						current: {
							label: "v2",
							// path: "v2"
						},
						"1": {
							label: "v1",
							path: "v1",
							// Prevent indexing of legacy docs
							noIndex: true,
							banner: "unmaintained",
						}
					}
				},
				blog: {
					showReadingTime: true,
					feedOptions: {
						type: ["rss", "atom"],
						xslt: true,
					},
					// // Please change this to your repo.
					// // Remove this to remove the "edit this page" links.
					// editUrl:
					// 	"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
					// Useful options to enforce blogging best practices
					onInlineTags: "warn",
					onInlineAuthors: "warn",
					onUntruncatedBlogPosts: "warn",
				},
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
		announcementBar: {
			id: "fluid-2-announcement",
			content: "🎉 Fluid Framework 2 is now in General Availability! <a target=\"_blank\" href=\"https://aka.ms/fluid/release_blog\">Learn more</a>.",
			isCloseable: true,
		},

		// Top nav-bar
		navbar: {
			title: "Fluid Framework",
			logo: {
				alt: "Fluid Framework Logo",
				src: "img/logo.png",
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
				{ to: "/blog", label: "Blog", position: "left" },
				{ to: "/community", label: "Community", position: "left" },
				{ to: "/support", label: "Support", position: "left" },
				{ to: "/new-site-features", label: "New Website Features", position: "left" },
				// {
				// 	href: githubUrl,
				// 	label: "GitHub",
				// 	position: "right",
				// },
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
