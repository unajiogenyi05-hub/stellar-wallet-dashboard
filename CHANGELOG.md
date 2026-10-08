# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- 2026-10-08 — Task 5: docs -->

### Added
- `index.html`: `Content-Security-Policy` meta tag (`default-src 'self'`; `script-src 'self' https://unpkg.com`; `connect-src` the four API hosts; `style-src 'self' 'unsafe-inline'`).

### Changed
- `README.md`: updated project structure to list all three test files with correct counts (36 total); removed Freighter claim; description matches actual code.
- `SECURITY.md`: added Soroban RPC and unpkg CDN as third-party request origins; updated data-flow description; added CSP section; expanded in-scope items to cover SRI bypass and Soroban RPC data.

<!-- 2026-10-08 — Tasks 4a / 4b / 4c -->

### Added
- **Network selector for Horizon** (4a): "Use Testnet" checkbox in the wallet search section wires `horizonUrl` to `HORIZON_TESTNET`; transaction explorer deep-links use `/explorer/testnet/` for testnet, `/explorer/public/` for mainnet.
- **Recent Events panel** (4b): after a successful contract inspect, fetches up to 10 events via Soroban RPC `getEvents` (`filters: [{ type: "contract", contractIds: [id] }]`); topics and values decoded with `decodeEvent` from `src/soroban.js`; non-fatal on error.
- **Accessibility** (4c): visually-hidden `<label>` elements for `#addressInput` and `#contractInput` (`.sr-only` class); `role="alert"` + `aria-live="assertive"` on both error paragraphs; `aria-live="polite"` on `#resultsSection` and `#contractResults`; visible focus rings via `:focus-visible`.
- `styles.css`: `.sr-only`, `.network-selector`, and event-item CSS classes.

### Changed
- `src/render.js` `renderTransactions`: added `network` parameter (`'mainnet'`|`'testnet'`) to set the correct stellar.expert explorer base URL.

<!-- 2026-10-08 — Task 3 -->

### Added
- `tests/render.test.js`: 4 jsdom-based tests verifying that `escapeHtml` prevents XSS — a malicious `asset_code` value (`<img src=x onerror=...>`) produces no `<img>` or `<script>` DOM nodes after rendering.

### Changed
- `app.js`: converted to an ES module (`import`/`export`); imports utility, API, render, and Soroban helpers from `src/`; deleted ~330 lines of duplicated implementations.
- `index.html`: `<script src="app.js">` → `<script type="module" src="app.js">`.
- `src/soroban.js` `decodeXdrEntry`: updated XDR access patterns for `@stellar/stellar-sdk` v17 (property-style access: `ledgerData.type`, `contractData.val`, `instance.executable.type`) instead of the old `.switch().name` / method-call style.
- `package.json`: added `jsdom@25.0.1` devDependency; `npm test` now runs all three test files (36 tests).

### Fixed
- `app.js` `renderBalances` (old monolith): used bare `innerHTML` with unescaped `asset_code`/`asset_issuer`; the refactored version delegates to `src/render.js` which escapes all fields through `escapeHtml`.

<!-- 2026-10-08 — Task 2 -->

### Added
- `tests/soroban.test.js`: 9 unit tests covering `strKeyToBytes` (valid decode, wrong prefix, wrong length, bad checksum, invalid base32 character) and `buildContractInstanceKey` (output matches SDK XDR, discriminant values, durability).
- `@stellar/stellar-sdk@17.1.0` added as a devDependency for the Soroban unit tests.

### Fixed
- `app.js` `strKeyToBytes`: version byte check was `0x02`; corrected to `0x10` (the Stellar strkey version byte for contract addresses, `2 << 3`). Added CRC16-XModem (poly=0x1021, little-endian) checksum validation so corrupt or wrong-prefix keys are rejected instead of silently decoded.
- `app.js` `buildContractInstanceKey`: ScVal discriminant at offset 40 was `11` (`scvU256`); corrected to `20` (`scvLedgerKeyContractInstance`). Verified against `@stellar/stellar-sdk` v17.1.0 `xdr.LedgerKey.contractData(...)` output.

<!-- 2026-10-08 — Task 1 -->

### Fixed
- `.eslintrc.json`: added `overrides` so `src/**/*.js` and `app.js` are parsed as ES modules (`sourceType: "module"`) and `tests/**/*.js` as CommonJS scripts (`env.node: true`, `sourceType: "script"`); eliminates four parse errors that failed CI.
- `package.json`: `lint` script now includes `tests/` so test files are also linted.

<!-- 2026-10-04 -->

### Added
- `src/utils.js`: pure utility functions (`isValidStellarAddress`, `formatAmount`, `truncateMiddle`, `timeAgo`, `formatNative`, `escapeHtml`) as an ES module.
- `src/api.js`: Horizon and Soroban RPC fetch logic as an ES module, with timeout, 429 rate-limit, and network-error handling.
- `src/render.js`: DOM render functions as an ES module; all fields escaped via `escapeHtml`.
- `src/soroban.js`: Soroban XDR decode helpers (`decodeXdrEntry`, `decodeEvent`, `xdrValTypeLabel`) as an ES module.
- `tests/utils.test.js`: 23 unit tests for all pure utility functions using `node:test`.
- `.github/workflows/pages.yml`: GitHub Pages deploy workflow.

### Changed
- `index.html`: added SRI hash (`integrity` + `crossorigin="anonymous"`) to the unpkg `@stellar/stellar-sdk@17.1.0` script tag.
- `package.json`: added `"test"` script; `eslint` and `html-validate` added as devDependencies.
- `.github/workflows/ci.yml`: added `npm test` step and `npx html-validate index.html`.
- `SECURITY.md`: rewritten for this repository.
- `CONTRIBUTING.md`: rewritten for this repository.

<!-- 2026-09-20 -->

### Added
- Soroban Contract Explorer panel (`index.html`, `app.js`, `styles.css`): enter a contract ID (C...), choose testnet or mainnet, read ledger entries via Soroban RPC `getLedgerEntries`.

### Changed
- Decodes entries with `@stellar/stellar-sdk` 17.1.0 loaded from unpkg: wasm hash and instance-storage count from the contract instance entry, `scValToNative` for other entries, `escapeHtml` on all rendered values, raw XDR in a collapsible `<details>` element, `(SDK not loaded)` fallback if CDN fails.

### Fixed
- ESLint: removed `Buffer` usage (not available in browser); replaced with `Array.from` hex mapping.
- html-validate: void-style self-closing inputs and missing `type="button"` on buttons.

## [0.1.0] - 2026-09-02

### Added
- Stellar public key input with client-side validation (`G[A-Z2-7]{55}` regex) and descriptive error messages
- Horizon API integration for account overview: sequence number, subentry count, home domain, last modified ledger
- Multi-asset balance rendering with XLM-first sorting and formatted amounts (up to 7 decimal places, trailing zeros stripped)
- Recent transactions list with hash truncation, operation count, relative timestamps (`timeAgo`), and success/failure badges
- Paginated "Load More" transactions using Horizon cursor-based pagination
- Copy-to-clipboard button for the full wallet address with visual success/failure feedback
- `truncateMiddle()` utility for scannable address display throughout the UI
- Two example address quick-launch buttons for immediate demo use
- Responsive layout supporting desktop and mobile viewports
- Deep links to [Stellar Expert](https://stellar.expert) explorer for each transaction hash
- `CONTRIBUTING.md` — contribution guide
- `LICENSE` — MIT license
- `.github/ISSUE_TEMPLATE/` — bug report and feature request templates

[Unreleased]: https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/releases/tag/v0.1.0
