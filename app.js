/**
 * app.js — Orchestrator for Stellar Wallet Dashboard.
 *
 * Imports pure functions from src/ modules; this file contains only
 * DOM wiring, state, and event handlers.
 */

import {
  HORIZON_MAINNET,
  HORIZON_TESTNET,
  SOROBAN_RPC_TESTNET,
  SOROBAN_RPC_MAINNET,
  TX_PAGE_SIZE,
  fetchAccount,
  fetchTransactions,
  sorobanRpc,
} from './src/api.js';

import {
  renderNetworkBadge,
  renderAccount,
  renderBalances,
  renderTransactions,
  setTxCount,
} from './src/render.js';

import {
  decodeXdrEntry,
} from './src/soroban.js';

import {
  isValidStellarAddress,
  isValidContractId,
  truncateMiddle,
} from './src/utils.js';

// ─── Strkey helpers (contract key builder lives here; only needed in app.js) ──

/**
 * CRC16-XModem checksum used by Stellar strkeys (poly=0x1021, init=0).
 * @param {number[]} bytes
 * @returns {number} 16-bit CRC
 */
function crc16xmodem(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= (byte << 8);
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/**
 * Decode a Stellar Strkey (C... contract address) to 32 raw bytes.
 * Validates version byte (0x10), length, and CRC16-XModem checksum.
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
  // 1 version byte (0x10) + 32 data bytes + 2 CRC bytes = 35 bytes
  if (bytes.length !== 35) return null;
  if (bytes[0] !== 0x10) return null;
  const storedCrc = bytes[33] | (bytes[34] << 8);
  const computedCrc = crc16xmodem(bytes.slice(0, 33));
  if (storedCrc !== computedCrc) return null;
  return new Uint8Array(bytes.slice(1, 33));
}

/**
 * Build the XDR base64 for a LedgerKey.contractData(contractInstance) key.
 * Layout (big-endian, 48 bytes):
 *   [0-3]   LedgerKey discriminant: CONTRACT_DATA = 6
 *   [4-7]   ScAddress discriminant: CONTRACT = 1
 *   [8-39]  32-byte contract hash
 *   [40-43] ScVal discriminant: SCV_LEDGER_KEY_CONTRACT_INSTANCE = 20
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
  view.setUint32(40, 20); // SCV_LEDGER_KEY_CONTRACT_INSTANCE
  view.setUint32(44, 1);  // PERSISTENT
  return btoa(String.fromCharCode(...buf));
}

// ─── State ────────────────────────────────────────────────────────────────────

let currentAddress = '';
let nextTxPageUrl = null;
let horizonUrl = HORIZON_MAINNET;

// ─── DOM References ───────────────────────────────────────────────────────────

const addressInput    = document.getElementById('addressInput');
const searchBtn       = document.getElementById('searchBtn');
const errorMsg        = document.getElementById('errorMsg');
const resultsSection  = document.getElementById('resultsSection');
const emptyState      = document.getElementById('emptyState');
const loadMoreBtn     = document.getElementById('loadMoreBtn');
const copyBtn         = document.getElementById('copyBtn');
const contractInput      = document.getElementById('contractInput');
const contractSearchBtn  = document.getElementById('contractSearchBtn');
const contractErrorMsg   = document.getElementById('contractErrorMsg');
const contractResults    = document.getElementById('contractResults');
const contractIdDisplay  = document.getElementById('contractIdDisplay');
const contractNetwork    = document.getElementById('contractNetwork');
const contractEntryCount = document.getElementById('contractEntryCount');
const contractWasmHash   = document.getElementById('contractWasmHash');
const contractEntriesList = document.getElementById('contractEntriesList');
const useTestnetToggle   = document.getElementById('useTestnet');

// ─── Error / Loading helpers ──────────────────────────────────────────────────

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');
}

function setLoading(loading) {
  searchBtn.disabled = loading;
  searchBtn.querySelector('.btn-text').textContent = loading ? 'Loading\u2026' : 'Search';
}

function showContractError(msg) {
  contractErrorMsg.textContent = msg;
  contractErrorMsg.classList.remove('hidden');
}

function clearContractError() {
  contractErrorMsg.textContent = '';
  contractErrorMsg.classList.add('hidden');
}

// ─── Wallet Search ────────────────────────────────────────────────────────────

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
    const [account, txPage] = await Promise.all([
      fetchAccount(address, horizonUrl),
      fetchTransactions(address, horizonUrl),
    ]);

    renderAccount(account);
    renderBalances(account.balances);
    renderNetworkBadge(horizonUrl === HORIZON_TESTNET ? 'Testnet' : 'Mainnet');

    const txs = txPage._embedded?.records ?? [];
    setTxCount(txs.length);
    renderTransactions(txs);

    const nextHref = txPage._links?.next?.href;
    if (nextHref && txs.length === TX_PAGE_SIZE) {
      nextTxPageUrl = nextHref;
      loadMoreBtn.classList.remove('hidden');
    }

    resultsSection.classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    emptyState.classList.remove('hidden');
  } finally {
    setLoading(false);
  }
}

async function loadMoreTransactions() {
  if (!nextTxPageUrl) return;

  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading\u2026';

  try {
    const txPage = await fetchTransactions(currentAddress, horizonUrl, nextTxPageUrl);
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

// ─── Soroban Contract Inspector ───────────────────────────────────────────────

async function inspectContract() {
  const id = contractInput.value.trim();
  clearContractError();
  contractResults.classList.add('hidden');

  if (!id) { showContractError('Please enter a contract ID.'); return; }
  if (!isValidContractId(id)) {
    showContractError('Invalid contract ID. It should start with "C" and be 56 characters long.');
    return;
  }

  const isTestnet = useTestnetToggle.checked;
  const rpcUrl = isTestnet ? SOROBAN_RPC_TESTNET : SOROBAN_RPC_MAINNET;
  const networkLabel = isTestnet ? 'Testnet' : 'Mainnet';

  contractSearchBtn.disabled = true;
  contractSearchBtn.querySelector('.btn-text').textContent = 'Loading\u2026';

  try {
    const contractBytes = strKeyToBytes(id);
    if (!contractBytes) throw new Error('Invalid contract ID (strkey decode failed).');
    const instanceKeyXdr = buildContractInstanceKey(contractBytes);
    const result = await sorobanRpc(rpcUrl, 'getLedgerEntries', { keys: [instanceKeyXdr] });
    const entries = result.entries || [];

    contractIdDisplay.textContent = id;
    contractNetwork.textContent = networkLabel;
    contractEntryCount.textContent = entries.length;

    let globalWasmHash = null;
    const decoded = entries.map((entry, i) => {
      const xdr = entry.xdr || '';
      const { decoded: decodedVal, wasmHash } = decodeXdrEntry(xdr, i === 0 ? 'instance' : 'data');
      if (wasmHash && !globalWasmHash) globalWasmHash = wasmHash;
      return {
        index: i + 1,
        decodedVal,
        lastModifiedLedger: entry.lastModifiedLedgerSeq || '\u2014',
        rawXdr: xdr,
      };
    });

    contractWasmHash.textContent = globalWasmHash
      ? `${globalWasmHash.slice(0, 32)}\u2026`
      : entries.length > 0 ? '(stellar_asset or SDK unavailable)' : 'No entries found';

    contractEntriesList.innerHTML = '';
    if (decoded.length === 0) {
      const p = document.createElement('p');
      p.style.cssText = 'color:var(--color-text-muted);font-size:0.875rem;';
      p.textContent = 'No ledger entries found for this contract.';
      contractEntriesList.appendChild(p);
    } else {
      decoded.forEach((e) => {
        const item = document.createElement('div');
        item.className = 'entry-item';

        const header = document.createElement('div');
        header.className = 'entry-header';

        const keySpan = document.createElement('span');
        keySpan.className = 'entry-key';
        keySpan.textContent = `Entry ${e.index}`;

        const ledgerSpan = document.createElement('span');
        ledgerSpan.className = 'entry-ledger';
        ledgerSpan.textContent = `Last modified: ledger #${
          typeof e.lastModifiedLedger === 'number'
            ? e.lastModifiedLedger.toLocaleString()
            : e.lastModifiedLedger
        }`;

        header.appendChild(keySpan);
        header.appendChild(ledgerSpan);

        const decodedDiv = document.createElement('div');
        decodedDiv.className = 'entry-decoded';
        decodedDiv.textContent = e.decodedVal;  // textContent — no XSS risk

        const details = document.createElement('details');
        details.className = 'entry-raw-details';
        const summary = document.createElement('summary');
        summary.textContent = 'Raw XDR';
        const xdrDiv = document.createElement('div');
        xdrDiv.className = 'entry-xdr';
        xdrDiv.title = e.rawXdr;
        xdrDiv.textContent = truncateMiddle(e.rawXdr, 40, 40);

        details.appendChild(summary);
        details.appendChild(xdrDiv);

        item.appendChild(header);
        item.appendChild(decodedDiv);
        item.appendChild(details);
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

// ─── Event Listeners ──────────────────────────────────────────────────────────

searchBtn.addEventListener('click', () => lookupWallet(addressInput.value));

addressInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookupWallet(addressInput.value);
});

loadMoreBtn.addEventListener('click', loadMoreTransactions);

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentAddress);
    copyBtn.textContent = '\u2705';
    setTimeout(() => { copyBtn.textContent = '\uD83D\uDCCB'; }, 1500);
  } catch {
    copyBtn.textContent = '\u274C';
    setTimeout(() => { copyBtn.textContent = '\uD83D\uDCCB'; }, 1500);
  }
});

document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const addr = btn.dataset.address;
    addressInput.value = addr;
    lookupWallet(addr);
  });
});

contractSearchBtn.addEventListener('click', inspectContract);
contractInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') inspectContract();
});
