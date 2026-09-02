# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
