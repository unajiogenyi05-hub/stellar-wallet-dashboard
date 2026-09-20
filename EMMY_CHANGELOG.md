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
