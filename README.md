# Stellar Wallet Dashboard

A static web dashboard for exploring Stellar wallets and Soroban smart contracts.
Enter a Stellar public key to view balances, recent transactions, and account details
via the Horizon API. Enter a Soroban contract ID to inspect its on-chain ledger entries
and recent events via the Soroban RPC.

[![CI](https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live:** https://unajiogenyi05-hub.github.io/stellar-wallet-dashboard/

---

## Features

**Horizon wallet panel**
- Enter any Stellar public key (G...) to look up the account
- Balances: all assets held, XLM-first, formatted amounts
- Recent transactions: hash, operation count, relative timestamps, success/failure badges
- Account details: sequence number, subentry count, home domain, last modified ledger
- Paginated "Load More" using Horizon cursor-based pagination
- "Use Testnet" checkbox switches the Horizon lookup between mainnet and testnet (the transaction explorer links follow)
- Timeout, rate-limit (429), network-failure and not-found errors are shown as messages

**Soroban Contract Explorer panel**
- Enter a contract ID (C...; the checksum is verified) and choose Testnet or Mainnet (separate checkbox from the wallet panel)
- Reads the contract instance entry via Soroban RPC `getLedgerEntries`
- Decodes entries using `@stellar/stellar-sdk` 17.1.0 loaded from unpkg:
  - Wasm hash and instance-storage entry count from the contract instance entry
  - `scValToNative` conversion for other data entries
  - Raw XDR in a collapsible `<details>` element for inspection
- "Recent Events" view using `getEvents`, decoded with the same SDK
- `(SDK not loaded)` fallback with truncated XDR if the CDN script fails to load

> **Note:** The Soroban panel shows the contract instance entry (not the contract's
> other storage entries) and decodes XDR client-side. It was tried against one
> testnet contract (the native XLM contract) and against mocked responses, not against
> every contract layout; treat it as an inspection tool, not a production data source.

---

## Quick Start

No installation needed:

```bash
git clone https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard.git
cd stellar-wallet-dashboard
open index.html   # macOS
# or: xdg-open index.html  (Linux)
```

Or serve locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Structure | HTML5 |
| Styling   | Vanilla CSS (CSS variables) |
| Logic     | Vanilla JavaScript (ES modules, no build step) |
| Horizon   | [Stellar Horizon REST API](https://developers.stellar.org/docs/data/apis/horizon) |
| Soroban   | [Soroban JSON-RPC](https://developers.stellar.org/docs/data/apis/rpc) |
| XDR decoding | `@stellar/stellar-sdk` 17.1.0 from unpkg CDN (with SRI) |

---

## API Used

| Purpose | Endpoint |
|---------|----------|
| Account info | `GET https://horizon.stellar.org/accounts/{address}` |
| Transactions | `GET https://horizon.stellar.org/accounts/{address}/transactions` |
| Testnet account | `GET https://horizon-testnet.stellar.org/accounts/{address}` |
| Ledger entries | `POST https://soroban-testnet.stellar.org` (`getLedgerEntries`) |
| Contract events | `POST https://soroban-testnet.stellar.org` (`getEvents`) |
| Mainnet RPC | `POST https://soroban-mainnet.stellar.org` |

---

## Project Structure

```
stellar-wallet-dashboard/
├── index.html              # Main HTML page
├── styles.css              # All CSS styles
├── app.js                  # Orchestrator: wires DOM events to src/ modules
├── src/
│   ├── utils.js            # Pure utility functions (no DOM/network)
│   ├── api.js              # Horizon and Soroban RPC fetch functions
│   ├── render.js           # DOM render functions
│   └── soroban.js          # Contract ID/key helpers, XDR decoding (SDK-dependent)
├── tests/
│   ├── utils.test.js       # node:test unit tests for src/utils.js
│   ├── soroban.test.js     # contract ID decoding and ledger key building
│   └── render.test.js      # jsdom tests: rendered values are escaped
├── README.md
├── CHANGELOG.md
├── SECURITY.md
├── CONTRIBUTING.md
├── package.json
├── .eslintrc.json
├── .htmlvalidate.json
└── .github/
    └── workflows/
        ├── ci.yml          # ESLint + html-validate + unit tests
        └── pages.yml       # Deploy to GitHub Pages on push to main
```

---

## Development

```bash
# Install dev tools
npm ci

# Run unit tests (36 tests; Node 22 or newer)
npm test

# Lint
npm run lint

# Validate HTML
npx html-validate index.html
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

This is a read-only dashboard. It never requests or stores private keys.
See [SECURITY.md](SECURITY.md).

## License

MIT
