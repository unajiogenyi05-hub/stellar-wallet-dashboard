/**
 * src/api.js — Network layer for Stellar Wallet Dashboard.
 *
 * Handles Horizon REST calls and Soroban JSON-RPC 2.0 calls with
 * user-visible error messages for all failure modes (timeout, 429,
 * network failure, invalid account, invalid contract).
 */

'use strict';

export const HORIZON_MAINNET = 'https://horizon.stellar.org';
export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_TESTNET = 'https://soroban-testnet.stellar.org';
export const SOROBAN_RPC_MAINNET = 'https://soroban-mainnet.stellar.org';

export const TX_PAGE_SIZE = 15;

/** Timeout for all network requests (milliseconds). */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Fetch with a timeout. Throws a descriptive Error on failure.
 * @param {string|URL} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The Stellar network may be slow — please try again.');
    }
    throw new Error('Network error: could not reach the Stellar network. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a Retry-After header value (seconds or HTTP-date) into milliseconds.
 * Returns a sensible default if the header is absent or unparseable.
 * @param {Response} response
 * @returns {number} milliseconds to wait
 */
function retryAfterMs(response) {
  const header = response.headers.get('Retry-After');
  if (!header) return 5000;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return Math.min(seconds * 1000, 30000);
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return 5000;
}

/**
 * Fetch account data from Horizon.
 * @param {string} address - Stellar public key (G...)
 * @param {string} horizonUrl
 * @returns {Promise<Object>}
 */
export async function fetchAccount(address, horizonUrl = HORIZON_MAINNET) {
  const response = await fetchWithTimeout(`${horizonUrl}/accounts/${encodeURIComponent(address)}`);

  if (response.status === 404) {
    throw new Error('Account not found. This address may not be activated on the Stellar network yet.');
  }
  if (response.status === 429) {
    const wait = Math.ceil(retryAfterMs(response) / 1000);
    throw new Error(`Rate limited by Horizon. Please wait ${wait} second(s) and try again.`);
  }
  if (!response.ok) {
    throw new Error(`Horizon API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch recent transactions for an account from Horizon.
 * @param {string} address
 * @param {string} horizonUrl
 * @param {string|null} pageUrl - Optional cursor-based next-page URL
 * @returns {Promise<Object>} Horizon paged response
 */
export async function fetchTransactions(address, horizonUrl = HORIZON_MAINNET, pageUrl = null) {
  const url = pageUrl
    ? pageUrl
    : `${horizonUrl}/accounts/${encodeURIComponent(address)}/transactions?limit=${TX_PAGE_SIZE}&order=desc`;

  const response = await fetchWithTimeout(url);

  if (response.status === 429) {
    const wait = Math.ceil(retryAfterMs(response) / 1000);
    throw new Error(`Rate limited by Horizon. Please wait ${wait} second(s) and try again.`);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Call the Soroban JSON-RPC 2.0 API.
 * @param {string} rpcUrl
 * @param {string} method
 * @param {object} params
 * @returns {Promise<any>}
 */
export async function sorobanRpc(rpcUrl, method, params) {
  const response = await fetchWithTimeout(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });

  if (response.status === 429) {
    const wait = Math.ceil(retryAfterMs(response) / 1000);
    throw new Error(`Rate limited by Soroban RPC. Please wait ${wait} second(s) and try again.`);
  }
  if (!response.ok) {
    throw new Error(`Soroban RPC HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    const msg = data.error.message || JSON.stringify(data.error);
    // Surface "not found" distinctly
    if (/not found|doesn't exist|does not exist/i.test(msg)) {
      throw new Error(`Contract not found on this network. Check the contract ID and selected network.`);
    }
    throw new Error(`Soroban RPC error: ${msg}`);
  }
  return data.result;
}
