# 🌟 Stellar Wallet Dashboard

A clean, fast, open-source web dashboard for exploring any Stellar wallet. Enter a Stellar public key and instantly view balances, recent transactions, and account details — all powered by the live Stellar Horizon API.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://unajiogenyi05-hub.github.io/stellar-wallet-dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ Features

- 🔍 **Wallet Lookup** — Enter any Stellar public key to explore the account
- 💰 **Balances** — See all assets held including XLM and custom tokens
- 📋 **Transaction History** — Browse recent transactions with status, hash, and timestamps
- 📄 **Account Details** — Sequence number, subentry count, home domain, and last modified ledger
- 📱 **Responsive Design** — Works on desktop and mobile
- 🌐 **No Backend Required** — Pure HTML, CSS, and JavaScript with no build step
- 🔗 **Deep Links** — Each transaction links directly to the Stellar Expert explorer
- 📋 **Copy Address** — One-click copy of the wallet address

## 🚀 Quick Start

No installation needed. Just open the file in your browser:

```bash
git clone https://github.com/unajiogenyi05-hub/stellar-wallet-dashboard.git
cd stellar-wallet-dashboard
open index.html   # macOS
# or: xdg-open index.html  (Linux)
# or: start index.html      (Windows)
```

Or serve it locally with any static server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080` in your browser.

## 🛠️ Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Structure  | HTML5                        |
| Styling    | Vanilla CSS (CSS variables)  |
| Logic      | Vanilla JavaScript (ES2020)  |
| Data       | [Stellar Horizon API](https://developers.stellar.org/docs/data/apis/horizon) |
| No build   | Zero dependencies, zero config |

## 📡 API Used

This project uses the **public Stellar Horizon API** — no API key required.

- **Account info:** `GET https://horizon.stellar.org/accounts/{address}`
- **Transactions:** `GET https://horizon.stellar.org/accounts/{address}/transactions`

Full API documentation: [developers.stellar.org](https://developers.stellar.org/docs/data/apis/horizon)

## 🗂️ Project Structure

```
stellar-wallet-dashboard/
├── index.html          # Main HTML page
├── styles.css          # All CSS styles
├── app.js              # JavaScript logic (Horizon API calls, rendering)
├── README.md           # This file
├── CONTRIBUTING.md     # How to contribute
├── package.json        # Project metadata
└── .github/
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, a new feature, improved documentation, or better styling — all PRs are appreciated.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Good First Issues

Look for issues labeled `good first issue` or `trivial` — these are great starting points for new contributors.

## 📋 Roadmap

- [ ] Add support for Stellar Testnet
- [ ] Show operation details inside each transaction
- [ ] Add XLM price in USD (via CoinGecko API)
- [ ] Dark/Light theme toggle
- [ ] Export transaction history as CSV
- [ ] Add search history (localStorage)
- [ ] Support for Stellar Federation addresses (e.g., `user*stellar.org`)
- [ ] Accessibility audit and ARIA improvements

## 🐛 Known Issues / Limitations

- Horizon public API retains only ~1 year of historical data
- Very new accounts (unfunded) will return a "not found" error
- Rate limiting may apply for frequent lookups

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for the Stellar ecosystem. Not affiliated with the Stellar Development Foundation.
