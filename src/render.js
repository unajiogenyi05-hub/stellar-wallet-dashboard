/**
 * src/render.js — DOM render functions for Stellar Wallet Dashboard.
 *
 * All functions in this module write to the DOM and have no network
 * dependencies.
 */

'use strict';

import { truncateMiddle, formatAmount, timeAgo, escapeHtml } from './utils.js';

// ─── DOM References ───────────────────────────────────────────────────────────

const accountAddressEl = document.getElementById('accountAddress');
const sequenceNumberEl = document.getElementById('sequenceNumber');
const subentryCountEl  = document.getElementById('subentryCount');
const homeDomainEl     = document.getElementById('homeDomain');
const lastModifiedEl   = document.getElementById('lastModified');
const balanceCountEl   = document.getElementById('balanceCount');
const txCountEl        = document.getElementById('txCount');
const balancesList     = document.getElementById('balancesList');
const transactionsList = document.getElementById('transactionsList');
const accountNetworkEl = document.getElementById('accountNetwork');

// ─── Public render functions ──────────────────────────────────────────────────

/**
 * Update the network badge in the account overview card.
 * @param {string} label - 'Mainnet' or 'Testnet'
 */
export function renderNetworkBadge(label) {
  if (accountNetworkEl) accountNetworkEl.textContent = label;
}

/**
 * Render account overview fields.
 * @param {Object} account - Horizon account record
 */
export function renderAccount(account) {
  accountAddressEl.textContent = account.account_id;
  sequenceNumberEl.textContent = account.sequence;
  subentryCountEl.textContent  = account.subentry_count;
  homeDomainEl.textContent     = account.home_domain || '\u2014';
  lastModifiedEl.textContent   = account.last_modified_ledger
    ? `Ledger #${account.last_modified_ledger.toLocaleString()}`
    : '\u2014';
}

/**
 * Render the balances list.
 * @param {Array} balances - Array of Horizon balance objects
 */
export function renderBalances(balances) {
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
    // asset code/issuer come from a trusted API; escapeHtml used for issuer just in case
    item.innerHTML = `
      <div class="balance-asset">
        <div class="asset-icon">${escapeHtml(assetCode.slice(0, 3))}</div>
        <div>
          <div class="asset-name">${escapeHtml(assetCode)}</div>
          <div class="asset-issuer">${escapeHtml(issuer)}</div>
        </div>
      </div>
      <div class="balance-amount">
        <div class="amount-value">${escapeHtml(formatAmount(bal.balance))}</div>
        <div class="amount-label">${escapeHtml(assetCode)}</div>
      </div>
    `;
    balancesList.appendChild(item);
  });
}

/**
 * Render a list of transactions, optionally appending to existing ones.
 * @param {Array} transactions - Array of Horizon transaction records
 * @param {boolean} append - If true, append instead of replace
 * @param {'mainnet'|'testnet'} [network='mainnet'] - Network for explorer links
 */
export function renderTransactions(transactions, append = false, network = 'mainnet') {
  if (!append) {
    transactionsList.innerHTML = '';
  }

  if (transactions.length === 0 && !append) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--color-text-muted);font-size:0.875rem;padding:0.5rem 0;';
    p.textContent = 'No transactions found.';
    transactionsList.appendChild(p);
    return;
  }

  const explorerBase = network === 'testnet'
    ? 'https://stellar.expert/explorer/testnet'
    : 'https://stellar.expert/explorer/public';

  transactions.forEach((tx) => {
    const success = tx.successful;
    const explorerUrl = `${explorerBase}/tx/${encodeURIComponent(tx.hash)}`;

    const item = document.createElement('div');
    item.className = 'tx-item';

    const icon = document.createElement('div');
    icon.className = `tx-icon ${success ? 'success' : 'failed'}`;
    icon.textContent = success ? '\u2713' : '\u2717';

    const body = document.createElement('div');
    body.className = 'tx-body';

    const link = document.createElement('a');
    link.className = 'tx-hash';
    link.href = explorerUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = tx.hash;
    link.textContent = truncateMiddle(tx.hash, 12, 12);

    const meta = document.createElement('div');
    meta.className = 'tx-meta';

    const ops = document.createElement('span');
    ops.className = 'tx-ops';
    ops.textContent = `${tx.operation_count} operation${tx.operation_count !== 1 ? 's' : ''}`;
    meta.appendChild(ops);

    if (tx.memo) {
      const tag = document.createElement('span');
      tag.className = 'tx-tag';
      tag.textContent = `memo: ${tx.memo_type}`;
      meta.appendChild(tag);
    }
    if (!success) {
      const tag = document.createElement('span');
      tag.className = 'tx-tag';
      tag.style.color = 'var(--color-danger)';
      tag.textContent = 'failed';
      meta.appendChild(tag);
    }

    body.appendChild(link);
    body.appendChild(meta);

    const time = document.createElement('div');
    time.className = 'tx-time';
    time.textContent = timeAgo(tx.created_at);

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(time);
    transactionsList.appendChild(item);
  });
}

/**
 * Set the displayed transaction count badge.
 * @param {number} count
 */
export function setTxCount(count) {
  txCountEl.textContent = `${count} shown`;
}
