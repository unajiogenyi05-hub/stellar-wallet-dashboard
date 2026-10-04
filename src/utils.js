/**
 * src/utils.js — Pure utility functions for Stellar Wallet Dashboard.
 *
 * These functions have no side effects and no DOM/network dependencies,
 * making them straightforward to unit-test.
 */

'use strict';

/**
 * Truncate a long string with an ellipsis in the middle.
 * @param {string} str
 * @param {number} startChars
 * @param {number} endChars
 * @returns {string}
 */
export function truncateMiddle(str, startChars = 8, endChars = 8) {
  if (!str || str.length <= startChars + endChars + 3) return str;
  return `${str.slice(0, startChars)}\u2026${str.slice(-endChars)}`;
}

/**
 * Format a Stellar amount (up to 7 decimal places, trailing zeros stripped).
 * @param {string|number} amount
 * @returns {string}
 */
export function formatAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

/**
 * Format an ISO date string as a human-readable relative time.
 * @param {string} isoDate
 * @returns {string}
 */
export function timeAgo(isoDate) {
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
 * Validate a Stellar public key (G..., 56 characters, base32 alphabet).
 * @param {string} address
 * @returns {boolean}
 */
export function isValidStellarAddress(address) {
  return /^G[A-Z2-7]{55}$/.test(address.trim());
}

/**
 * Validate a Soroban contract ID (C..., 56 characters, base32 alphabet).
 * @param {string} id
 * @returns {boolean}
 */
export function isValidContractId(id) {
  return /^C[A-Z2-7]{55}$/.test(id.trim());
}

/**
 * Escape HTML special characters to prevent XSS when rendering decoded values.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a native JS value (output of scValToNative) as a readable string.
 * Handles BigInt, Uint8Array, arrays, objects, and primitives.
 * @param {any} val
 * @returns {string}
 */
export function formatNative(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'bigint') return val.toString();
  if (typeof val === 'boolean') return val.toString();
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number') return val.toString();
  if (val instanceof Uint8Array) {
    const hex = Array.from(val).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.length > 64 ? `0x${hex.slice(0, 64)}\u2026` : `0x${hex}`;
  }
  if (Array.isArray(val)) {
    const items = val.map(formatNative);
    const joined = items.join(', ');
    return joined.length > 80 ? `[${joined.slice(0, 80)}\u2026]` : `[${joined}]`;
  }
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val, (_k, v) => typeof v === 'bigint' ? v.toString() : v);
      return str.length > 100 ? `${str.slice(0, 100)}\u2026` : str;
    } catch (_) {
      return Object.prototype.toString.call(val);
    }
  }
  return String(val);
}
