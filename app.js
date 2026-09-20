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

// ═══ Soroban Contract Explorer (SDK-powered) ════════════════════════════════
//
// Uses @stellar/stellar-sdk loaded via CDN (unpkg) for proper XDR decoding.
// The SDK is loaded as a global (window.StellarSdk) by the script tag in
// index.html. We fall back gracefully if the SDK fails to load.

const SOROBAN_RPC_TESTNET = 'https://soroban-testnet.stellar.org';
const SOROBAN_RPC_MAINNET = 'https://soroban-mainnet.stellar.org';

const contractInput       = document.getElementById('contractInput');
const contractSearchBtn   = document.getElementById('contractSearchBtn');
const contractErrorMsg    = document.getElementById('contractErrorMsg');
const contractResults     = document.getElementById('contractResults');
const contractIdDisplay   = document.getElementById('contractIdDisplay');
const contractNetwork     = document.getElementById('contractNetwork');
const contractEntryCount  = document.getElementById('contractEntryCount');
const contractWasmHash    = document.getElementById('contractWasmHash');
const contractEntriesList = document.getElementById('contractEntriesList');
const useTestnetToggle    = document.getElementById('useTestnet');

function showContractError(msg) {
  contractErrorMsg.textContent = msg;
  contractErrorMsg.classList.remove('hidden');
}

function clearContractError() {
  contractErrorMsg.textContent = '';
  contractErrorMsg.classList.add('hidden');
}

/**
 * Call the Soroban JSON-RPC 2.0 API.
 * @param {string} rpcUrl
 * @param {string} method
 * @param {object} params
 * @returns {Promise<any>}
 */
async function sorobanRpc(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP error: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.result;
}

/**
 * Decode a Stellar Strkey (C... contract address) to 32 raw bytes.
 * Returns null if invalid.
 * @param {string} strkey
 * @returns {Uint8Array|null}
 */
function strKeyToBytes(strkey) {
  if (!strkey || strkey.length !== 56 || strkey[0] !== 'C') return null;
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str = strkey.toUpperCase();
  let bits = 0, value = 0;
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const idx = ALPHABET.indexOf(str[i]);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  if (bytes.length < 34 || bytes[0] !== 0x02) return null;
  return new Uint8Array(bytes.slice(1, 33));
}

/**
 * Build the XDR base64 for a LedgerKey.contractData(contractInstance) key.
 * Layout (big-endian, 48 bytes total):
 *   [0-3]  LedgerKey discriminant: CONTRACT_DATA = 6
 *   [4-7]  ScAddress discriminant: CONTRACT = 1
 *   [8-39] 32-byte contract hash
 *   [40-43] ScVal discriminant: SCV_LEDGER_KEY_CONTRACT_INSTANCE = 11
 *   [44-47] ContractDataDurability: PERSISTENT = 1
 * @param {Uint8Array} contractHash
 * @returns {string} base64
 */
function buildContractInstanceKey(contractHash) {
  const buf = new Uint8Array(48);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 6);   // CONTRACT_DATA
  view.setUint32(4, 1);   // ScAddress::Contract
  buf.set(contractHash, 8);
  view.setUint32(40, 11); // SCV_LEDGER_KEY_CONTRACT_INSTANCE
  view.setUint32(44, 1);  // PERSISTENT
  return btoa(String.fromCharCode(...buf));
}

/**
 * Try to decode a base64 XDR string into a human-readable value using the
 * stellar-sdk (loaded as window.StellarSdk from CDN).
 *
 * For the contract instance entry (the first entry), the XDR is a
 * LedgerEntryData, not a raw ScVal. We try to parse it as LedgerEntryData
 * first, then fall back to ScVal, then to a raw hex dump.
 *
 * @param {string} xdrBase64 - base64-encoded XDR
 * @param {boolean} isInstance - true for the instance entry
 * @returns {{ decoded: string, wasmHash: string|null }}
 */
function decodeEntryXdr(xdrBase64, isInstance) {
  const sdk = window.StellarSdk;
  if (!sdk) {
    return { decoded: `(SDK not loaded) ${truncateMiddle(xdrBase64, 30, 30)}`, wasmHash: null };
  }

  let wasmHash = null;

  try {
    // Parse as LedgerEntryData
    const entryData = sdk.xdr.LedgerEntryData.fromXDR(xdrBase64, 'base64');
    const contractData = entryData.contractData && entryData.contractData();
    if (contractData) {
      const val = contractData.val();
      if (isInstance) {
        // Instance entry: value is ScContractInstance, contains wasmHash + storage
        try {
          const instance = val.instance && val.instance();
          if (instance) {
            const hashBytes = instance.executable && instance.executable().wasmHash &&
                              instance.executable().wasmHash();
            if (hashBytes) {
              wasmHash = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
            }
            // Storage map (may be null for contracts with no instance storage)
            const storage = instance.storage && instance.storage();
            const storageEntries = storage ? storage.length : 0;
            const decoded = wasmHash
              ? `instance (wasm: ${wasmHash.slice(0, 16)}…, ${storageEntries} instance-storage entries)`
              : `instance entry (${storageEntries} instance-storage entries)`;
            return { decoded, wasmHash };
          }
        } catch (_) {
          // fall through
        }
      }
      // For non-instance entries or if instance parse failed, convert val to native
      try {
        const native = sdk.scValToNative(val);
        return { decoded: formatNative(native), wasmHash };
      } catch (_) {
        return { decoded: xdrValTypeLabel(val), wasmHash };
      }
    }
  } catch (_) {
    // Not a LedgerEntryData — try raw ScVal
  }

  try {
    const scVal = sdk.xdr.ScVal.fromXDR(xdrBase64, 'base64');
    const native = sdk.scValToNative(scVal);
    return { decoded: formatNative(native), wasmHash };
  } catch (_) {
    // Neither worked — show truncated XDR
    return { decoded: truncateMiddle(xdrBase64, 30, 30), wasmHash };
  }
}

/**
 * Return the ScVal type label as a readable string when native conversion fails.
 * @param {object} scVal - XDR ScVal object
 * @returns {string}
 */
function xdrValTypeLabel(scVal) {
  try {
    const name = scVal && scVal.switch && scVal.switch().name;
    return name ? `(${name})` : '(unknown ScVal type)';
  } catch (_) {
    return '(undecodable)';
  }
}

/**
 * Format a native JS value (output of scValToNative) as a readable string.
 * Handles BigInt, Buffer, Uint8Array, objects, and primitives.
 * @param {any} val
 * @returns {string}
 */
function formatNative(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val.toString();
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number') return val.toString();
  if (val instanceof Uint8Array) {
    const hex = Array.from(val).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.length > 64 ? `0x${hex.slice(0, 64)}…` : `0x${hex}`;
  }
  if (Array.isArray(val)) {
    const items = val.map(formatNative);
    const joined = items.join(', ');
    return joined.length > 80 ? `[${joined.slice(0, 80)}…]` : `[${joined}]`;
  }
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val, (_k, v) => typeof v === 'bigint' ? v.toString() : v);
      return str.length > 100 ? `${str.slice(0, 100)}…` : str;
    } catch (_) {
      return Object.prototype.toString.call(val);
    }
  }
  return String(val);
}

/**
 * Fetch ledger entries for a contract using getLedgerEntries.
 * @param {string} contractId
 * @param {string} rpcUrl
 * @returns {Promise<object>}
 */
async function fetchContractData(contractId, rpcUrl) {
  const contractBytes = strKeyToBytes(contractId);
  if (!contractBytes) throw new Error('Invalid contract ID.');
  const instanceKeyXdr = buildContractInstanceKey(contractBytes);
  return sorobanRpc(rpcUrl, 'getLedgerEntries', { keys: [instanceKeyXdr] });
}

/**
 * Main handler: inspect a Soroban contract.
 */
async function inspectContract() {
  const id = contractInput.value.trim();
  clearContractError();
  contractResults.classList.add('hidden');

  if (!id) { showContractError('Please enter a contract ID.'); return; }
  if (!/^C[A-Z2-7]{55}$/.test(id)) {
    showContractError('Invalid contract ID. It should start with "C" and be 56 characters long.');
    return;
  }

  const isTestnet = useTestnetToggle.checked;
  const rpcUrl = isTestnet ? SOROBAN_RPC_TESTNET : SOROBAN_RPC_MAINNET;
  const networkLabel = isTestnet ? 'Testnet' : 'Mainnet';

  contractSearchBtn.disabled = true;
  contractSearchBtn.querySelector('.btn-text').textContent = 'Loading…';

  try {
    const result = await fetchContractData(id, rpcUrl);
    const entries = result.entries || [];

    contractIdDisplay.textContent = id;
    contractNetwork.textContent = networkLabel;
    contractEntryCount.textContent = entries.length;

    // Decode entries using the SDK
    let globalWasmHash = null;
    const decoded = entries.map((entry, i) => {
      const xdr = entry.xdr || '';
      const { decoded: decodedVal, wasmHash } = decodeEntryXdr(xdr, i === 0);
      if (wasmHash && !globalWasmHash) globalWasmHash = wasmHash;
      return {
        index: i + 1,
        decodedVal,
        lastModifiedLedger: entry.lastModifiedLedgerSeq || '—',
        rawXdr: xdr,
      };
    });

    contractWasmHash.textContent = globalWasmHash
      ? `${globalWasmHash.slice(0, 32)}…`
      : entries.length > 0 ? '(decode requires SDK — check SDK load)' : 'No entries found';

    // Render entries
    contractEntriesList.innerHTML = '';
    if (decoded.length === 0) {
      contractEntriesList.innerHTML =
        '<p style="color:var(--color-text-muted);font-size:0.875rem;">No ledger entries found for this contract.</p>';
    } else {
      decoded.forEach((e) => {
        const item = document.createElement('div');
        item.className = 'entry-item';
        item.innerHTML = `
          <div class="entry-header">
            <span class="entry-key">Entry ${e.index}</span>
            <span class="entry-ledger">Last modified: ledger #${
              typeof e.lastModifiedLedger === 'number'
                ? e.lastModifiedLedger.toLocaleString()
                : e.lastModifiedLedger
            }</span>
          </div>
          <div class="entry-decoded">${escapeHtml(e.decodedVal)}</div>
          <details class="entry-raw-details">
            <summary>Raw XDR</summary>
            <div class="entry-xdr" title="${e.rawXdr}">${truncateMiddle(e.rawXdr, 40, 40)}</div>
          </details>
        `;
        contractEntriesList.appendChild(item);
      });
    }

    contractResults.classList.remove('hidden');
  } catch (err) {
    showContractError(err.message || 'Failed to fetch contract data.');
  } finally {
    contractSearchBtn.disabled = false;
    contractSearchBtn.querySelector('.btn-text').textContent = 'Inspect';
  }
}

/**
 * Escape HTML special characters to prevent XSS when rendering decoded values.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

contractSearchBtn.addEventListener('click', inspectContract);
contractInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') inspectContract(); });
