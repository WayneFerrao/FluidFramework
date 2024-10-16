# @fluid-internal/devtools-view

This library contains a simple view for visualizing data generated by Fluid Devtools.

This library also powers our [Chrome Extension](https://developer.chrome.com/docs/extensions/overview/): [@fluid-internal/devtools-browser-extension][].


<!-- AUTO-GENERATED-CONTENT:START (LIBRARY_README_HEADER) -->

<!-- prettier-ignore-start -->
<!-- NOTE: This section is automatically generated using @fluid-tools/markdown-magic. Do not update these generated contents directly. -->

**IMPORTANT: This package is intended strictly as an implementation detail of the Fluid Framework and is not intended for public consumption.**
**We make no stability guarantees regarding its APIs.**

## Using Fluid Framework libraries

When taking a dependency on a Fluid Framework library's public APIs, we recommend using a `^` (caret) version range, such as `^1.3.4`.
While Fluid Framework libraries may use different ranges with interdependencies between other Fluid Framework libraries,
library consumers should always prefer `^`.

If using any of Fluid Framework's unstable APIs (for example, its `beta` APIs), we recommend using a more constrained version range, such as `~`.

## Installation

To get started, install the package by running the following command:

```bash
npm i @fluid-internal/devtools-view
```

<!-- prettier-ignore-end -->

<!-- AUTO-GENERATED-CONTENT:END -->

## Usage

This library has 2 primary entry-points:

1. A React component: `DevtoolsPanel`.
2. An environment-agnostic rendering hook: TODO.

## Working in the package

### Build

To build the package locally, first ensure you have run `pnpm install` from the root of the mono-repo.
Next, to build the code, run `npm run build` from the root of the mono-repo, or use [fluid-build](https://github.com/microsoft/FluidFramework/tree/main/build-tools/packages/build-tools#running-fluid-build-command-line) via `fluid-build -t build`.

-   Note: Once you have run a build from the root, assuming no other changes outside of this package, you may run `npm run build` directly within this directory for a faster build.
    If you make changes to any of this package's local dependencies, you will need to run a build again from the root before building again from directly within this package.

### Testing

This package uses [jest](https://jestjs.io/) and [testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
to power its unit tests.
The corresponding test modules can be found under `src/test`.

To run only the unit tests, first ensure you have followed the [build](#build) steps above.
Next, run `npm run test:jest` from a terminal within this directory.

<!-- AUTO-GENERATED-CONTENT:START (README_FOOTER) -->

<!-- prettier-ignore-start -->
<!-- NOTE: This section is automatically generated using @fluid-tools/markdown-magic. Do not update these generated contents directly. -->

## Contribution Guidelines

There are many ways to [contribute](https://github.com/microsoft/FluidFramework/blob/main/CONTRIBUTING.md) to Fluid.

-   Participate in Q&A in our [GitHub Discussions](https://github.com/microsoft/FluidFramework/discussions).
-   [Submit bugs](https://github.com/microsoft/FluidFramework/issues) and help us verify fixes as they are checked in.
-   Review the [source code changes](https://github.com/microsoft/FluidFramework/pulls).
-   [Contribute bug fixes](https://github.com/microsoft/FluidFramework/blob/main/CONTRIBUTING.md).

Detailed instructions for working in the repo can be found in the [Wiki](https://github.com/microsoft/FluidFramework/wiki).

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

This project may contain Microsoft trademarks or logos for Microsoft projects, products, or services.
Use of these trademarks or logos must follow Microsoft’s [Trademark & Brand Guidelines](https://www.microsoft.com/trademarks).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.

## Help

Not finding what you're looking for in this README? Check out [fluidframework.com](https://fluidframework.com/docs/).

Still not finding what you're looking for? Please [file an issue](https://github.com/microsoft/FluidFramework/wiki/Submitting-Bugs-and-Feature-Requests).

Thank you!

## Trademark

This project may contain Microsoft trademarks or logos for Microsoft projects, products, or services.

Use of these trademarks or logos must follow Microsoft's [Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).

Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.

<!-- prettier-ignore-end -->

<!-- AUTO-GENERATED-CONTENT:END -->

<!-- Links -->

[@fluid-internal/devtools-browser-extension]: https://github.com/microsoft/FluidFramework/tree/main/packages/tools/devtools/devtools-browser-extension
