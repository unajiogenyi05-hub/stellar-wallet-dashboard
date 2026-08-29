# Contributing to Stellar Wallet Dashboard

Thank you for your interest in contributing! This is a beginner-friendly project and all skill levels are welcome.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Issue Labels](#issue-labels)
- [Style Guide](#style-guide)

---

## Code of Conduct

Be kind and respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Harassment, discrimination, or hostile behavior will not be tolerated.

---

## How to Contribute

### 1. Reporting Bugs

Found a bug? Open an issue using the **Bug Report** template. Include:

- What you did
- What you expected to happen
- What actually happened
- Screenshots if helpful
- Browser and OS

### 2. Suggesting Features

Have an idea? Open a **Feature Request** issue. Describe what you want and why it would be useful.

### 3. Fixing Issues

Browse [open issues](../../issues). Issues labeled `good first issue` or `trivial` are ideal for new contributors.

---

## Development Setup

This project requires **zero build tools**. You just need a browser and a text editor.

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/stellar-wallet-dashboard.git
cd stellar-wallet-dashboard

# 2. Open in your editor
code .   # VS Code

# 3. Open the app in your browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows

# Or run a local server (recommended for development)
python3 -m http.server 8080
# then visit http://localhost:8080
```

No npm install, no build step, no config files to set up.

---

## Submitting a Pull Request

1. **Create a branch** for your change:
   ```bash
   git checkout -b fix/typo-in-readme
   # or
   git checkout -b feature/add-csv-export
   ```

2. **Make your changes.** Keep them focused — one issue per PR.

3. **Test your changes** by opening `index.html` in a browser and verifying everything works.

4. **Commit with a clear message:**
   ```bash
   git commit -m "fix: correct typo in README install instructions"
   ```

5. **Push and open a PR:**
   ```bash
   git push origin your-branch-name
   ```
   Then open a Pull Request on GitHub. Fill in the PR template.

### PR Checklist

- [ ] My change is focused (one fix or feature per PR)
- [ ] I tested the change in a browser
- [ ] I updated `README.md` if I added a new feature
- [ ] My code follows the style guide below
- [ ] I referenced the related issue (e.g., `Closes #12`)

---

## Issue Labels

| Label            | Meaning                                      |
|------------------|----------------------------------------------|
| `good first issue` | Perfect for new contributors               |
| `trivial`        | Small change, ~30 minutes of work            |
| `bug`            | Something is broken                          |
| `feature`        | New feature request                          |
| `documentation`  | Docs-only change                             |
| `help wanted`    | Maintainer is looking for help               |
| `accessibility`  | Related to a11y improvements                 |

---

## Style Guide

### HTML

- Use semantic elements (`<section>`, `<nav>`, `<article>`, etc.)
- Always include `alt` text on images and `aria-label` on icon-only buttons
- Indent with 2 spaces

### CSS

- Use the existing CSS variables (e.g., `var(--color-primary)`) — don't hardcode colors
- Add new variables to `:root` if needed
- Mobile-first: add responsive overrides in the `@media (max-width: 600px)` block

### JavaScript

- Use `'use strict'`
- Prefer `const` over `let`, avoid `var`
- Write clear JSDoc comments for functions
- Use `async/await` over raw `.then()` chains
- Keep functions small and focused on one task

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add CSV export button
fix: handle accounts with no transactions
docs: add setup instructions to README
style: fix inconsistent spacing in styles.css
refactor: extract renderBalance into its own function
```

---

Questions? Open an issue or start a discussion. We're happy to help! 🌟
