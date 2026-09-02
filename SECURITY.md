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
| **Backend server** | None — all requests go directly from the browser to the public Stellar Horizon API |
| **Data storage** | None — no `localStorage`, no `sessionStorage`, no cookies, no IndexedDB |
| **Data transmitted** | Only Stellar **public keys** (already publicly visible on-chain) |
| **Third-party tracking** | None |

The only data flow is:
```
User enters public key → Browser fetches Horizon API → Data rendered to DOM → Nothing stored
```

All data displayed is already publicly available on the Stellar blockchain. There is no private information in this application.

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

- **XSS via Horizon API response data** — any field from the Horizon API rendered via `innerHTML` instead of `textContent` could allow injected script execution if a malicious actor controls account data on-chain
- **Open redirect** — external links constructed from API data (e.g., transaction explorer URLs) that could redirect to malicious sites
- **Prototype pollution** — malicious API responses that modify `Object.prototype` via unsafe JSON handling
- **Content Security Policy gaps** — missing or misconfigured CSP headers that weaken XSS defenses
- **Dependency vulnerabilities** — known CVEs in `serve` or `eslint` dev dependencies

### Out of scope

- Public key enumeration — Stellar public keys are publicly visible on-chain by design
- Rate limiting by Horizon — this is controlled by the Stellar Development Foundation, not this project
- Issues requiring the user to be tricked into entering a private key — the app never prompts for one
- Bugs in the Stellar Horizon API itself — report to [Stellar security](https://stellar.org/security)

---

## Acknowledgements

Responsible disclosure is appreciated. Valid vulnerability reporters will be credited in release notes unless they prefer anonymity.
