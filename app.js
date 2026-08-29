/**
 * Stellar Wallet Dashboard — app.js
 *
 * Uses the public Stellar Horizon API (no API key needed).
 * Horizon base URL: https://horizon.stellar.org
 * Docs: https://developers.stellar.org/docs/data/apis/horizon
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const HORIZON_URL = 'https://horizon.stellar.org';
const TX_PAGE_SIZE = 15;

// ─── State ────────────────────────────────────────────────────────────────────

let currentAddress = '';
let nextTxPageUrl = null;

// ─── DOM References ───────────────────────────────────────────────────────────

const addressInput   = document.getElementById('addressInput');
const searchBtn      = document.getElementById('searchBtn');
const errorMsg       = document.getElementById('errorMsg');
const resultsSection = document.getElementById('resultsSection');
const emptyState     = document.getElementById('emptyState');
const loadMoreBtn    = document.getElementById('loadMoreBtn');
const copyBtn        = document.getElementById('copyBtn');

// Account fields
const accountAddressEl = document.getElementById('accountAddress');
const sequenceNumberEl = document.getElementById('sequenceNumber');
const subentryCountEl  = document.getElementById('subentryCount');
const homeDomainEl     = document.getElementById('homeDomain');
const lastModifiedEl   = document.getElementById('lastModified');
const balanceCountEl   = document.getElementById('balanceCount');
const txCountEl        = document.getElementById('txCount');
const balancesList     = document.getElementById('balancesList');
const transactionsList = document.getElementById('transactionsList');

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Truncate a long string with ellipsis in the middle.
 * @param {string} str
 * @param {number} startChars
 * @param {number} endChars
 * @returns {string}
 */
function truncateMiddle(str, startChars = 8, endChars = 8) {
  if (!str || str.length <= startChars + endChars + 3) return str;
  return `${str.slice(0, startChars)}…${str.slice(-endChars)}`;
}

/**
 * Format a Stellar amount (7 decimal places) nicely.
 * @param {string|number} amount
 * @returns {string}
 */
function formatAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  // Show up to 7 decimals, strip trailing zeros
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

/**
 * Format an ISO date string to a human-readable relative time.
 * @param {string} isoDate
 * @returns {string}
 */
function timeAgo(isoDate) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60)  return `${diffSecs}s ago`;
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30)  return `${diffDays}d ago`;

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/**
 * Basic validation for a Stellar public key (starts with G, 56 chars).
 * @param {string} address
 * @returns {boolean}
 */
function isValidStellarAddress(address) {
  return /^G[A-Z2-7]{55}$/.test(address.trim());
}

/**
 * Show an error message below the search bar.
 * @param {string} message
 */
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');
}

/**
 * Toggle the loading state of the search button.
 * @param {boolean} loading
 */
function setLoading(loading) {
  searchBtn.disabled = loading;
  searchBtn.querySelector('.btn-text').textContent = loading ? 'Loading…' : 'Search';
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch account data from Horizon.
 * @param {string} address - Stellar public key
 * @returns {Promise<Object>}
 */
async function fetchAccount(address) {
  const response = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Account not found. This address may not be activated on the Stellar network yet.');
    }
    throw new Error(`Horizon API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch recent transactions for an account from Horizon.
 * @param {string} address - Stellar public key
 * @param {string|null} pageUrl - Optional next-page URL for pagination
 * @returns {Promise<Object>} - Horizon paged response
 */
async function fetchTransactions(address, pageUrl = null) {
  const url = pageUrl
    ? pageUrl
    : `${HORIZON_URL}/accounts/${address}/transactions?limit=${TX_PAGE_SIZE}&order=desc`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status}`);
  }
  return response.json();
}

// ─── Render Functions ─────────────────────────────────────────────────────────

/**
 * Render account overview fields.
 * @param {Object} account - Horizon account record
 */
function renderAccount(account) {
  accountAddressEl.textContent = account.account_id;
  sequenceNumberEl.textContent = account.sequence;
  subentryCountEl.textContent  = account.subentry_count;
  homeDomainEl.textContent     = account.home_domain || '—';
  lastModifiedEl.textContent   = account.last_modified_ledger
    ? `Ledger #${account.last_modified_ledger.toLocaleString()}`
    : '—';
}

/**
 * Render the balances list.
 * @param {Array} balances - Array of Horizon balance objects
 */
function renderBalances(balances) {
  balanceCountEl.textContent = `${balances.length} asset${balances.length !== 1 ? 's' : ''}`;
  balancesList.innerHTML = '';

  // Sort: XLM first, then alphabetically
  const sorted = [...balances].sort((a, b) => {
    if (a.asset_type === 'native') return -1;
    if (b.asset_type === 'native') return 1;
    return (a.asset_code || '').localeCompare(b.asset_code || '');
  });

  sorted.forEach((bal) => {
    const isNative = bal.asset_type === 'native';
    const assetCode = isNative ? 'XLM' : (bal.asset_code || bal.asset_type);
    const issuer = isNative ? 'Stellar Lumens (native)' : truncateMiddle(bal.asset_issuer);

    const item = document.createElement('div');
    item.className = 'balance-item';
    item.innerHTML = `
      <div class="balance-asset">
        <div class="asset-icon">${assetCode.slice(0, 3)}</div>
        <div>
          <div class="asset-name">${assetCode}</div>
          <div class="asset-issuer">${issuer}</div>
        </div>
      </div>
      <div class="balance-amount">
        <div class="amount-value">${formatAmount(bal.balance)}</div>
        <div class="amount-label">${assetCode}</div>
      </div>
    `;
    balancesList.appendChild(item);
  });
}

/**
 * Render a list of transactions, optionally appending to existing ones.
 * @param {Array} transactions - Array of Horizon transaction records
 * @param {boolean} append - If true, append instead of replace
 */
function renderTransactions(transactions, append = false) {
  if (!append) {
    transactionsList.innerHTML = '';
  }

  if (transactions.length === 0 && !append) {
    transactionsList.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.875rem;padding:0.5rem 0;">No transactions found.</p>';
    return;
  }

  transactions.forEach((tx) => {
    const success = tx.successful;
    const explorerUrl = `https://stellar.expert/explorer/public/tx/${tx.hash}`;

    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-icon ${success ? 'success' : 'failed'}">
        ${success ? '✓' : '✗'}
      </div>
      <div class="tx-body">
        <a
          class="tx-hash"
          href="${explorerUrl}"
          target="_blank"
          rel="noopener"
          title="${tx.hash}"
        >${truncateMiddle(tx.hash, 12, 12)}</a>
        <div class="tx-meta">
          <span class="tx-ops">${tx.operation_count} operation${tx.operation_count !== 1 ? 's' : ''}</span>
          ${tx.memo ? `<span class="tx-tag">memo: ${tx.memo_type}</span>` : ''}
          ${!success ? '<span class="tx-tag" style="color:var(--color-danger)">failed</span>' : ''}
        </div>
      </div>
      <div class="tx-time">${timeAgo(tx.created_at)}</div>
    `;
    transactionsList.appendChild(item);
  });
}

// ─── Main Search Logic ────────────────────────────────────────────────────────

/**
 * Run a full wallet lookup for a given Stellar address.
 * @param {string} address
 */
async function lookupWallet(address) {
  address = address.trim();
  clearError();

  if (!address) {
    showError('Please enter a Stellar public key.');
    return;
  }

  if (!isValidStellarAddress(address)) {
    showError('Invalid Stellar address. It should start with "G" and be 56 characters long.');
    return;
  }

  currentAddress = address;
  setLoading(true);
  resultsSection.classList.add('hidden');
  emptyState.classList.add('hidden');
  loadMoreBtn.classList.add('hidden');
  nextTxPageUrl = null;

  try {
    // Fetch account and transactions in parallel
    const [account, txPage] = await Promise.all([
      fetchAccount(address),
      fetchTransactions(address),
    ]);

    // Render account overview
    renderAccount(account);
    renderBalances(account.balances);

    // Render transactions
    const txs = txPage._embedded?.records ?? [];
    txCountEl.textContent = `${txs.length} shown`;
    renderTransactions(txs);

    // Set up "Load More" if there's a next page
    const nextHref = txPage._links?.next?.href;
    if (nextHref && txs.length === TX_PAGE_SIZE) {
      nextTxPageUrl = nextHref;
      loadMoreBtn.classList.remove('hidden');
    }

    // Show results
    resultsSection.classList.remove('hidden');

  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    emptyState.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
}

/**
 * Load the next page of transactions and append them.
 */
async function loadMoreTransactions() {
  if (!nextTxPageUrl) return;

  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';

  try {
    const txPage = await fetchTransactions(currentAddress, nextTxPageUrl);
    const txs = txPage._embedded?.records ?? [];
    renderTransactions(txs, true);

    const nextHref = txPage._links?.next?.href;
    if (nextHref && txs.length === TX_PAGE_SIZE) {
      nextTxPageUrl = nextHref;
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
    } else {
      nextTxPageUrl = null;
      loadMoreBtn.classList.add('hidden');
    }
  } catch (err) {
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
    showError('Failed to load more transactions.');
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Search button click
searchBtn.addEventListener('click', () => {
  lookupWallet(addressInput.value);
});

// Press Enter in input
addressInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    lookupWallet(addressInput.value);
  }
});

// Load more transactions
loadMoreBtn.addEventListener('click', loadMoreTransactions);

// Copy address to clipboard
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentAddress);
    copyBtn.textContent = '✅';
    setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
  } catch {
    copyBtn.textContent = '❌';
    setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
  }
});

// Example address buttons
document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const addr = btn.dataset.address;
    addressInput.value = addr;
    lookupWallet(addr);
  });
});
