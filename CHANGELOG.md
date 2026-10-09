# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- 2026-10-09 -->

### Changed
- README.md and SECURITY.md describe the current feature set: wallet network checkbox, contract instance entry plus recent events, current test files and counts, Soroban RPC and the unpkg SDK as third-party requests, and that no Content Security Policy is shipped yet.

<!-- 2026-10-08 -->

### Fixed
- `.github/workflows/ci.yml`: bump Node.js from 20 to 22; `html-validate@11.12.0` requires `^22.22.0 || >= 24.8.0` and uses `fs.globSync` which is unavailable in Node 20, causing `TypeError: fs.globSync is not a function` in the Validate HTML step.
- `package.json`: updated `engines.node` from `>=18.0.0` to `>=22.0.0` to match the actual minimum required by devDependencies.

<!-- 2026-10-08 -->

### Added
- **Network selector for Horizon** (4a): "Use Testnet" checkbox in the wallet search section wires `horizonUrl` to `HORIZON_TESTNET`; transaction explorer deep-links use `/explorer/testnet/` for testnet, `/explorer/public/` for mainnet.
- **Recent Events panel** (4b): after a successful contract inspect, fetches up to 10 events via Soroban RPC `getEvents` (`filters: [{ type: "contract", contractIds: [id] }]`); topics and values decoded with `decodeEvent` from `src/soroban.js`; non-fatal on error.
- **Accessibility** (4c): visually-hidden `<label>` elements for `#addressInput` and `#contractInput` (`.sr-only` class); `role="alert"` + `aria-live="assertive"` on both error paragraphs; `aria-live="polite"` on `#resultsSection` and `#contractResults`; visible focus rings via `:focus-visible`; `.sr-only`, `.network-selector`, and event-item styles added to `styles.css`.

### Changed
- `src/render.js` `renderTransactions`: added `network` parameter (`'mainnet'`|`'testnet'`) to set the correct stellar.expert explorer base URL.

### Added
- `tests/render.test.js`: 4 jsdom-based tests verifying that `escapeHtml` prevents XSS — a malicious `asset_code` value (`<img src=x onerror=...>`) produces no `<img>` or `<script>` DOM nodes after rendering.

### Changed
- `app.js`: now an ES module that imports from `src/utils.js`, `src/api.js`, `src/render.js` and `src/soroban.js`; the duplicated implementations were deleted.
- `index.html`: `<script src="app.js">` → `<script type="module" src="app.js">`.
- `src/soroban.js` `decodeXdrEntry`: updated XDR access patterns for `@stellar/stellar-sdk` v17 (`ledgerData.type`, `ledgerData.contractData.val`, `instance.executable.type`) instead of the old `.switch().name` / `.val()` method-call style.
- `package.json`: added `jsdom@25.0.1` devDependency; `npm test` now runs all three test files (36 tests).

### Fixed
- `app.js` `renderBalances`: the old monolith used bare `innerHTML` with unescaped `asset_code`/`asset_issuer`; the refactored version delegates to `src/render.js` which escapes all fields through `escapeHtml`.

<!-- 2026-10-08 -->

### Fixed
- `.eslintrc.json`: added `overrides` so `src/**/*.js` and `app.js` are parsed as ES modules (`sourceType: "module"`) and `tests/**/*.js` as CommonJS scripts (`env.node: true`, `sourceType: "script"`); eliminates four parse errors that failed CI.
- `package.json`: `lint` script now includes `tests/` so test files are also linted.
- `app.js` `strKeyToBytes`: version byte check was `0x02`; corrected to `0x10` (the Stellar strkey version byte for contract addresses, `2 << 3`). Added CRC16-XModem (poly=0x1021, little-endian) checksum validation so corrupt or wrong-prefix keys are rejected instead of silently decoded.
- `app.js` `buildContractInstanceKey`: ScVal discriminant at offset 40 was `11` (`scvU256`); corrected to `20` (`scvLedgerKeyContractInstance`). Verified against `@stellar/stellar-sdk` v17.1.0 `xdr.LedgerKey.contractData(...)` output.
- `package.json`: added `@stellar/stellar-sdk@17.1.0` as a dev-only dependency for the new Soroban unit tests.

### Added
- `tests/soroban.test.js`: 9 unit tests covering `strKeyToBytes` (valid decode, wrong prefix, wrong length, bad checksum, invalid base32 character) and `buildContractInstanceKey` (output matches SDK XDR, discriminant values, durability).

<!-- 2026-10-04 -->

### Added
- `src/utils.js`: pure utility functions extracted from `app.js` (`isValidStellarAddress`, `formatAmount`, `truncateMiddle`, `timeAgo`, `formatNative`, `escapeHtml`) as an ES module.
- `src/api.js`: Horizon and Soroban RPC fetch logic as an ES module.
- `src/render.js`: DOM render functions as an ES module.
- `src/soroban.js`: Soroban XDR helpers and contract inspector as an ES module.
- `tests/utils.test.js`: unit tests for all pure utility functions using `node:test`.
- `.github/workflows/pages.yml`: GitHub Pages deploy workflow for static file publishing.

### Changed
- `index.html`: added SRI hash (`integrity` + `crossorigin="anonymous"`) to the unpkg `@stellar/stellar-sdk@17.1.0` script tag.
- `index.html`: `type="button"` on all buttons.
- `package.json`: added `"test": "node --test tests/utils.test.js"` script.
- `.github/workflows/ci.yml`: added `npm test` step.
- `SECURITY.md`: rewritten to be specific to this repository.
- `CONTRIBUTING.md`: rewritten to be specific to this repository.
- README.md: updated to describe the Soroban panel and the CDN-loaded SDK; added live GitHub Pages URL.

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
