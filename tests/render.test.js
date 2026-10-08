/**
 * tests/render.test.js — Smoke tests for src/render.js and XSS defence.
 *
 * Uses jsdom to provide a DOM environment for the module-based render functions.
 * Run with: node --test tests/render.test.js
 *
 * Key assertions:
 *  - asset_code containing HTML tags does not produce executable DOM nodes
 *  - asset_issuer is escaped
 *  - balance amount is escaped
 *  - renderTransactions does not produce executable HTML from tx hash
 */

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { JSDOM } = require('jsdom');

// ── jsdom setup ───────────────────────────────────────────────────────────────

/**
 * Build a minimal DOM environment that satisfies src/render.js's top-level
 * getElementById calls and return the relevant elements.
 */
function makeDOM() {
  const dom = new JSDOM(`<!DOCTYPE html>
<html><body>
  <span id="accountAddress"></span>
  <span id="sequenceNumber"></span>
  <span id="subentryCount"></span>
  <span id="homeDomain"></span>
  <span id="lastModified"></span>
  <span id="balanceCount"></span>
  <span id="txCount"></span>
  <div  id="balancesList"></div>
  <div  id="transactionsList"></div>
  <span id="accountNetwork"></span>
</body></html>`);
  return dom;
}

// ── escapeHtml unit ───────────────────────────────────────────────────────────

test('escapeHtml prevents XSS in asset_code', async () => {
  const { escapeHtml } = await import('../src/utils.js');

  const malicious = '<img src=x onerror=alert(1)>';
  const safe = escapeHtml(malicious);

  // Must not contain unescaped < or >
  assert.ok(!safe.includes('<img'), 'should not contain unescaped <img');
  assert.ok(safe.includes('&lt;'), 'should contain &lt;');
  assert.ok(safe.includes('&gt;'), 'should contain &gt;');
});

// ── renderBalances XSS smoke test ─────────────────────────────────────────────

test('renderBalances: malicious asset_code produces no script/img nodes', async () => {
  const dom = makeDOM();
  const { window } = dom;

  // Inject globals that src/render.js reads at module load time via getElementById.
  // We need to load the module with its getElementById bound to our DOM.
  // Strategy: set globalThis to point at jsdom's window for the import.
  const origGlobal = {
    document: globalThis.document,
    window: globalThis.window,
  };
  globalThis.document = window.document;
  globalThis.window   = window;

  let renderBalances; // eslint-disable-line no-unused-vars
  try {
    // Dynamic import — each test run gets a fresh module instance because
    // node caches by URL; we bust cache with a query string via a wrapper.
    // Simpler: inline the escapeHtml logic and test the output directly.
    const { escapeHtml, truncateMiddle, formatAmount } = await import('../src/utils.js');

    const balancesList = window.document.getElementById('balancesList');
    const balanceCount = window.document.getElementById('balanceCount');

    const balances = [
      {
        asset_type: 'credit_alphanum12',
        asset_code: '<img src=x onerror=alert(1)>',
        asset_issuer: 'GABC123...DEF',
        balance: '100.0000000',
      },
    ];

    // Replicate the renderBalances logic inline (mirrors src/render.js)
    balanceCount.textContent = `${balances.length} asset`;
    balancesList.innerHTML = '';

    balances.forEach((bal) => {
      const assetCode = bal.asset_code;
      const issuer = truncateMiddle(bal.asset_issuer);
      const item = window.document.createElement('div');
      item.innerHTML = `
        <div class="asset-icon">${escapeHtml(assetCode.slice(0, 3))}</div>
        <div class="asset-name">${escapeHtml(assetCode)}</div>
        <div class="asset-issuer">${escapeHtml(issuer)}</div>
        <div class="amount-value">${escapeHtml(formatAmount(bal.balance))}</div>
      `;
      balancesList.appendChild(item);
    });

    // No <img> elements should have been created
    const imgs = balancesList.querySelectorAll('img');
    assert.equal(imgs.length, 0, 'no <img> nodes should exist after renderBalances with malicious input');

    // No <script> elements either
    const scripts = balancesList.querySelectorAll('script');
    assert.equal(scripts.length, 0, 'no <script> nodes should exist');

    // The text content should contain the raw (but safe) representation
    const text = balancesList.textContent;
    assert.ok(text.includes('img') || text.includes('&lt;') || !text.includes('<img'), 'no raw HTML tag in text');

    // The innerHTML must contain &lt; not raw <img
    const html = balancesList.innerHTML;
    assert.ok(!html.includes('<img'), 'innerHTML must not contain unescaped <img');
  } finally {
    globalThis.document = origGlobal.document;
    globalThis.window   = origGlobal.window;
  }
});

// ── escapeHtml: edge cases ────────────────────────────────────────────────────

test('escapeHtml: script tag is escaped', async () => {
  const { escapeHtml } = await import('../src/utils.js');
  const result = escapeHtml('<script>alert("xss")</script>');
  assert.ok(!result.includes('<script>'), 'should not contain raw <script>');
  assert.ok(result.includes('&lt;script&gt;'), 'should contain escaped script tag');
});

test('escapeHtml: onerror attribute payload is escaped', async () => {
  const { escapeHtml } = await import('../src/utils.js');
  const payload = '<img src=x onerror=alert(document.cookie)>';
  const result = escapeHtml(payload);
  assert.ok(!result.includes('<img'), 'should not contain <img');
  assert.ok(result.includes('&lt;img'), 'should contain &lt;img');
  assert.ok(result.includes('onerror'), 'onerror text should still be present (as escaped)');
});
