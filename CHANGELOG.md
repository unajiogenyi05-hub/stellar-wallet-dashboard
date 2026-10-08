# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- 2026-10-08 -->

### Fixed
- `.eslintrc.json`: added `overrides` so `src/**/*.js` and `app.js` are parsed as ES modules (`sourceType: "module"`) and `tests/**/*.js` as CommonJS scripts (`env.node: true`, `sourceType: "script"`); eliminates four parse errors that failed CI.
- `package.json`: `lint` script now includes `tests/` so test files are also linted.

<!-- 2026-10-04 -->

### Added
- `src/utils.js`: pure utility functions extracted from `app.js` (`isValidStellarAddress`, `formatAmount`, `truncateMiddle`, `timeAgo`, `formatNative`, `escapeHtml`) as an ES module.
- `src/api.js`: Horizon and Soroban RPC fetch logic as an ES module.
- `src/render.js`: DOM render functions as an ES module.
- `src/soroban.js`: Soroban XDR helpers and contract inspector as an ES module.
- `tests/utils.test.js`: unit tests for all pure utility functions using `node:test`.
- `.github/workflows/pages.yml`: GitHub Pages deploy workflow for static file publishing.
- Freighter wallet connect button (read-only): fills the address field from the connected wallet; degrades gracefully when Freighter is not installed.
- Contract events view in the Soroban panel: fetches recent events via Soroban RPC `getEvents`, decoded with the SDK and the same `escapeHtml` safety; "(SDK not loaded)" fallback if CDN fails.
- Network selector (Mainnet / Testnet toggle) for the Horizon wallet lookup panel, matching the Soroban panel.

### Changed
- `app.js` split into ES modules (`src/utils.js`, `src/api.js`, `src/render.js`, `src/soroban.js`); `app.js` is now a thin orchestrator that imports from those modules; no build step introduced.
- `index.html`: added SRI hash (`integrity` + `crossorigin="anonymous"`) to the unpkg `@stellar/stellar-sdk@17.1.0` script tag.
- `index.html`: added Freighter connect button; accessibility labels, `aria-live` regions, visible focus states, and `type="button"` on all buttons.
- `package.json`: added `"test": "node --test tests/utils.test.js"` script.
- `.github/workflows/ci.yml`: added `npm test` step and updated ESLint to lint the module files.
- `SECURITY.md`: rewritten to be specific to this repository.
- `CONTRIBUTING.md`: rewritten to be specific to this repository.
- README.md: updated to describe the Soroban panel and the CDN-loaded SDK; added live GitHub Pages URL.

### Fixed
- Error and rate-limit handling for Horizon and Soroban RPC: user-visible messages for timeout, HTTP 429 (with retry-after or back-off), network failure, invalid account, and invalid contract ID; no silent failures.
- Accessibility: labels for all inputs, visible focus rings, `aria-live` on result and error regions, keyboard operation of all controls.

<!-- 2026-09-20 -->

### Added
- Soroban Contract Explorer panel (`index.html`, `app.js`, `styles.css`): enter a contract ID (C...), choose testnet or mainnet, read ledger entries through Soroban RPC `getLedgerEntries`.

### Changed
- Panel decodes entries with `@stellar/stellar-sdk` 17.1.0 loaded from unpkg (no npm dependency or build step): wasm hash and instance-storage count from the contract instance entry, ScVal to native conversion for other entries, `escapeHtml` for rendered values, raw XDR in a collapsible `<details>` element, "(SDK not loaded)" fallback with truncated XDR if the CDN fails.

### Fixed
- ESLint: `Buffer` is not defined (2 places in `app.js`; replaced `Buffer.from(...).toString('hex')` with an `Array.from` hex mapping and removed an unreachable `instanceof Buffer` branch).
- html-validate: `void-style` (2 self-closing inputs) and missing `type='button'` on the search button.

## [0.1.0] - 2026-09-02

### Added
- Stellar public key input with client-side validation (`G[A-Z2-7]{55}` regex) and descriptive error messages
- Horizon API integration for account overview: sequence number, subentry count, home domain, last modified ledger
- Multi-asset balance rendering with XLM-first sorting and formatted amounts (up to 7 decimal places, trailing zeros stripped)
- Recent transactions list with hash truncation, operation count, relative timestamps (`timeAgo`), and success/failure badges
- Paginated "Load More" transactions using Horizon cursor-based pagination
- Copy-to-clipboard button for the full wallet address with visual success/failure feedback
- `truncateMiddle()` utility for scannable address display throughout the UI (balances, transaction hashes)
- Two example address quick-launch buttons for immediate demo use
- Responsive layout supporting desktop and mobile viewports
- Deep links to [Stellar Expert](https://stellar.expert) explorer for each transaction hash
- `CONTRIBUTING.md` — contribution guide
- `LICENSE` — MIT license
- `.github/ISSUE_TEMPLATE/` — bug report and feature request templates

[Unreleased]: https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/releases/tag/v0.1.0
