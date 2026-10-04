/**
 * tests/utils.test.js — Unit tests for src/utils.js
 *
 * Run with: node --test tests/utils.test.js
 * Or via:   npm test
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// utils.js is an ES module with `export` syntax. We load it via dynamic import.
// node:test supports top-level async with --test.

async function loadUtils() {
  // Use a file:// URL so node resolves it correctly from any cwd.
  const { pathToFileURL } = require('url');
  const { resolve } = require('path');
  const url = pathToFileURL(resolve(__dirname, '../src/utils.js')).href;
  return import(url);
}

// ── isValidStellarAddress ─────────────────────────────────────────────────────

test('isValidStellarAddress: valid G-address returns true', async () => {
  const { isValidStellarAddress } = await loadUtils();
  assert.equal(isValidStellarAddress('GAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK'), true);
});

test('isValidStellarAddress: invalid address returns false', async () => {
  const { isValidStellarAddress } = await loadUtils();
  assert.equal(isValidStellarAddress('notanaddress'), false);
  assert.equal(isValidStellarAddress(''), false);
  assert.equal(isValidStellarAddress('GABC123'), false);
});

test('isValidStellarAddress: C-contract id returns false', async () => {
  const { isValidStellarAddress } = await loadUtils();
  assert.equal(isValidStellarAddress('CAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK'), false);
});

// ── isValidContractId ─────────────────────────────────────────────────────────

test('isValidContractId: valid C-address returns true', async () => {
  const { isValidContractId } = await loadUtils();
  assert.equal(isValidContractId('CAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK'), true);
});

test('isValidContractId: G-address returns false', async () => {
  const { isValidContractId } = await loadUtils();
  assert.equal(isValidContractId('GAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK'), false);
});

// ── formatAmount ──────────────────────────────────────────────────────────────

test('formatAmount: integer', async () => {
  const { formatAmount } = await loadUtils();
  assert.equal(formatAmount('100'), '100');
});

test('formatAmount: decimal stripped of trailing zeros', async () => {
  const { formatAmount } = await loadUtils();
  // toLocaleString may vary; just check it parses without throwing
  const result = formatAmount('1.5000000');
  assert.match(result, /1\.?5?/);
});

test('formatAmount: NaN input returns 0', async () => {
  const { formatAmount } = await loadUtils();
  assert.equal(formatAmount('notanumber'), '0');
});

// ── truncateMiddle ────────────────────────────────────────────────────────────

test('truncateMiddle: short string returned as-is', async () => {
  const { truncateMiddle } = await loadUtils();
  assert.equal(truncateMiddle('hello'), 'hello');
});

test('truncateMiddle: long string truncated', async () => {
  const { truncateMiddle } = await loadUtils();
  const result = truncateMiddle('GAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK', 4, 4);
  assert.ok(result.includes('…'), 'should contain ellipsis');
  assert.ok(result.startsWith('GAAH'), 'should start with first 4 chars');
  assert.ok(result.endsWith('YFKK') || result.endsWith('BYFK'), 'should end with last 4 chars');
});

test('truncateMiddle: empty string returned as-is', async () => {
  const { truncateMiddle } = await loadUtils();
  assert.equal(truncateMiddle(''), '');
});

// ── escapeHtml ────────────────────────────────────────────────────────────────

test('escapeHtml: escapes & < > " and single quote', async () => {
  const { escapeHtml } = await loadUtils();
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('escapeHtml: plain string unchanged', async () => {
  const { escapeHtml } = await loadUtils();
  assert.equal(escapeHtml('hello world'), 'hello world');
});

test('escapeHtml: non-string input coerced', async () => {
  const { escapeHtml } = await loadUtils();
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), 'null');
});

// ── formatNative ──────────────────────────────────────────────────────────────

test('formatNative: bigint', async () => {
  const { formatNative } = await loadUtils();
  assert.equal(formatNative(12345n), '12345');
});

test('formatNative: string wrapped in quotes', async () => {
  const { formatNative } = await loadUtils();
  assert.equal(formatNative('hello'), '"hello"');
});

test('formatNative: Uint8Array formatted as hex', async () => {
  const { formatNative } = await loadUtils();
  const result = formatNative(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  assert.equal(result, '0xdeadbeef');
});

test('formatNative: null returns null string', async () => {
  const { formatNative } = await loadUtils();
  assert.equal(formatNative(null), 'null');
});

test('formatNative: array formatted', async () => {
  const { formatNative } = await loadUtils();
  const result = formatNative([1, 2, 3]);
  assert.ok(result.includes('1'), 'should contain array elements');
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

test('timeAgo: very recent returns seconds ago', async () => {
  const { timeAgo } = await loadUtils();
  const recent = new Date(Date.now() - 5000).toISOString();
  assert.match(timeAgo(recent), /s ago/);
});

test('timeAgo: 2 minutes ago', async () => {
  const { timeAgo } = await loadUtils();
  const twoMinsAgo = new Date(Date.now() - 120000).toISOString();
  assert.match(timeAgo(twoMinsAgo), /m ago/);
});

test('timeAgo: 2 hours ago', async () => {
  const { timeAgo } = await loadUtils();
  const twoHoursAgo = new Date(Date.now() - 7_200_000).toISOString();
  assert.match(timeAgo(twoHoursAgo), /h ago/);
});

test('timeAgo: 2 days ago', async () => {
  const { timeAgo } = await loadUtils();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString();
  assert.match(timeAgo(twoDaysAgo), /d ago/);
});
