# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |

---

## Data Architecture & Privacy Guarantee

The Stellar Wallet Dashboard is a **pure read-only browser application**. The following is a formal statement of its data handling:

| Property | Detail |
|----------|--------|
| **Private keys** | Never requested, never accepted, never processed |
| **Seed phrases** | Never requested, never accepted, never processed |
| **Backend server** | None — all requests go directly from the browser to external APIs (see below) |
| **Data storage** | None — no `localStorage`, no `sessionStorage`, no cookies, no IndexedDB |
| **Data transmitted** | Only Stellar **public keys** and **contract IDs** (already publicly visible on-chain) |
| **Third-party tracking** | None |

### Third-party network requests

The app makes outbound requests to three external origins:

| Origin | Purpose |
|--------|---------|
| `https://horizon.stellar.org` / `https://horizon-testnet.stellar.org` | Horizon REST API — account info and transactions |
| `https://soroban-testnet.stellar.org` / `https://soroban-mainnet.stellar.org` | Soroban JSON-RPC — contract ledger entries and events |
| `https://unpkg.com` | CDN delivery of `@stellar/stellar-sdk@17.1.0` browser bundle for XDR decoding |

The unpkg script tag includes a `sha384` SRI integrity hash and `crossorigin="anonymous"` so the browser verifies the bundle before executing it.

### Content Security Policy

`index.html` sets a `Content-Security-Policy` meta tag:

```
default-src 'self';
script-src  'self' https://unpkg.com;
connect-src https://horizon.stellar.org
            https://horizon-testnet.stellar.org
            https://soroban-testnet.stellar.org
            https://soroban-mainnet.stellar.org;
style-src   'self' 'unsafe-inline'
```

`'unsafe-inline'` is required for the inline `style=` attributes used in a few dynamically-created DOM nodes. Removing it would require converting those to CSS classes.

The complete data flow is:

```
User enters public key / contract ID
  → Browser fetches Horizon API (account) or Soroban RPC (contract)
  → SDK bundle (loaded once from unpkg, SRI-verified) decodes XDR
  → Data rendered to DOM via textContent / escapeHtml
  → Nothing stored
```

All data displayed is already publicly available on the Stellar blockchain.

---

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Use GitHub's built-in private vulnerability reporting:
1. Go to the [Security tab](https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard/security)
2. Click **"Report a vulnerability"**
3. Describe the issue, steps to reproduce, and potential impact

### Response SLA

| Stage | Target |
|-------|--------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Patch / mitigation | Within 14 days for critical issues |

---

## Scope

### In scope

- **XSS via API response data** — fields from Horizon or Soroban RPC rendered via unescaped `innerHTML` could allow injected script execution if a malicious actor controls account or contract data on-chain; all rendered strings pass through `escapeHtml` or `textContent`
- **Open redirect** — external links constructed from API data (e.g., transaction explorer URLs) that could redirect to malicious sites
- **Prototype pollution** — malicious API responses that modify `Object.prototype` via unsafe JSON handling
- **Content Security Policy gaps** — the CSP meta tag restricts origins; a bypass would be in scope
- **SRI bypass** — a compromise of the unpkg CDN serving a different SDK bundle is in scope
- **Dependency vulnerabilities** — known CVEs in `serve`, `eslint`, `html-validate`, `jsdom`, or `@stellar/stellar-sdk` dev dependencies

### Out of scope

- Public key enumeration — Stellar public keys are publicly visible on-chain by design
- Rate limiting by Horizon or Soroban RPC — this is controlled by the Stellar Development Foundation, not this project
- Issues requiring the user to be tricked into entering a private key — the app never prompts for one
- Bugs in the Stellar Horizon API or Soroban RPC themselves — report to [Stellar security](https://stellar.org/security)

---

## Acknowledgements

Responsible disclosure is appreciated. Valid vulnerability reporters will be credited in release notes unless they prefer anonymity.
