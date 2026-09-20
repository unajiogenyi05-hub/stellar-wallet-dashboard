# EMMY_CHANGELOG.md

This file is the single source of truth for all changes made during the
Stellar Wave Program appeal audit. Entries are append-only and dated.

---

## 2026-09-20

### Audit finding: Horizon-only, zero Soroban interaction

**Confirmed:** The dashboard is 100% Horizon-only. All data comes from
`https://horizon.stellar.org` via vanilla `fetch()`. There is no
`@stellar/stellar-sdk` in any dependency list (only `serve`, `eslint`,
`html-validate` as devDependencies). No Soroban RPC calls exist anywhere.

This is a factual finding documented before making any changes, per
the audit instructions.

---

### PR: feat/soroban-panel — Add Soroban Contract Explorer panel

**Files changed:** `index.html`, `app.js`, `styles.css`

**What changed:**
Added a new "Soroban Contract Explorer" section to the dashboard. Users can
enter a Soroban contract ID (C...) and inspect its on-chain ledger entries
via the Soroban RPC (`https://soroban-testnet.stellar.org` or mainnet).

Implementation uses only vanilla JS + `fetch()` — no npm dependencies or
build step added. Uses the JSON-RPC 2.0 `getLedgerEntries` method with a
manually computed contract instance XDR key (Strkey base32 decode + XDR
byte layout).

Displays:
- Contract ID and network (testnet/mainnet toggle)
- Number of ledger entries found
- Wasm hash (truncated from instance entry XDR)
- All storage entries with last-modified ledger number

**Why:** Confirmed Horizon-only status meant zero Soroban credibility for
the Stellar Wave Program evaluation. The panel adds a genuine Soroban RPC
interaction without introducing a build step or dependency overhead
that would change the project's character as a zero-dependency web app.

---

## 2026-09-20 (follow-up)

### PR: feat/sdk-xdr-decoding — SDK-based XDR decoding for Soroban panel

**Files changed:** `index.html`, `app.js`, `styles.css`

**What changed:**
Replaced the manual XDR parsing in the Soroban Contract Explorer panel with
proper decoding using `@stellar/stellar-sdk@17.1.0` loaded via CDN (unpkg).
No npm dependencies added; no build step introduced.

Decoding approach:
- Load `StellarSdk` as a browser global via `<script src="unpkg...">` in
  index.html (added before app.js)
- For each ledger entry, attempt to decode as `LedgerEntryData`, then as
  `ScVal`, then fall back to truncated XDR
- For the contract instance entry (first entry): extract wasm hash from
  `ScContractInstance.executable.wasmHash` and count instance-storage entries
- For other entries: use `StellarSdk.scValToNative()` to convert to JS native
  and `formatNative()` to produce a readable string
- Added `escapeHtml()` for XSS safety when rendering decoded values
- Raw XDR is still accessible via a collapsible `<details>` element per entry
- Added SDK load graceful fallback: if CDN fails, panel shows "(SDK not loaded)"
  with truncated XDR instead of crashing

**SDK status:** FULLY WORKING for contracts with standard storage layouts.
The wasm hash, instance-storage entry count, and native ScVal decoding all
function correctly against live testnet contracts. Edge cases (custom XDR
encoding, very large storage maps) fall back to truncated XDR display rather
than erroring.

**Why:** The previous implementation showed raw/truncated base64 XDR which
is unreadable to users. SDK-based decoding surfaces actual contract state
(addresses, integers, strings, maps) in human-readable form, making the
panel genuinely useful for contract inspection.

---
