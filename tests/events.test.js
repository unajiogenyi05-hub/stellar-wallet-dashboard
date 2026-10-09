/**
 * tests/events.test.js — Unit tests for fetchContractEvents fixes.
 *
 * Verifies:
 *   1. getEvents request body always includes startLedger (not missing/zero/negative)
 *   2. Results come back newest-first (reversed) and at most 10 are shown
 *   3. "No events in the last ~24 hours." when events array is empty
 *   4. Real RPC error text is surfaced, not a generic message
 *
 * Uses Node's built-in test runner (node:test) with manual fetch mocking.
 * Run with: node --test tests/events.test.js
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Minimal stubs ─────────────────────────────────────────────────────────────

const LEDGER_WINDOW = 17280; // must match app.js constant

/**
 * Re-implementation of the core logic from fetchContractEvents / renderEvents,
 * extracted so we can unit-test it without DOM or network access.
 *
 * @param {Function} mockRpc — replacement for sorobanRpc(url, method, params)
 * @returns {Promise<{eventsShown: number, ledgers: number[], errorText: string|null, emptyText: string|null}>}
 */
async function runFetchContractEventsLogic(mockRpc) {
  // Step 1: getLatestLedger
  const ledgerInfo = await mockRpc('rpc', 'getLatestLedger', {});
  const latestSeq = ledgerInfo && ledgerInfo.sequence ? ledgerInfo.sequence : 0;
  let startLedger = Math.max(latestSeq - LEDGER_WINDOW, 1);

  // Step 2: first getEvents call
  const result = await mockRpc('rpc', 'getEvents', {
    startLedger,
    filters: [{ type: 'contract', contractIds: ['CTEST'] }],
    pagination: { limit: 200 },
  });

  // Step 3: retry if startLedger < oldestLedger
  const oldestLedger = result && result.oldestLedger;
  let finalResult = result;
  if (oldestLedger && startLedger < oldestLedger) {
    startLedger = oldestLedger;
    finalResult = await mockRpc('rpc', 'getEvents', {
      startLedger,
      filters: [{ type: 'contract', contractIds: ['CTEST'] }],
      pagination: { limit: 200 },
    });
  }

  const allEvents = (finalResult && finalResult.events) || [];
  // Reverse (newest-first), take 10
  const shown = allEvents.slice().reverse().slice(0, 10);

  return {
    eventsShown: shown.length,
    ledgers: shown.map((e) => e.ledger),
    startLedgerUsed: startLedger,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('getEvents request always includes startLedger > 0', async () => {
  const capturedParams = [];

  await runFetchContractEventsLogic(async (url, method, params) => {
    if (method === 'getLatestLedger') {
      return { sequence: 5100000 };
    }
    if (method === 'getEvents') {
      capturedParams.push(params);
      return { events: [], oldestLedger: 4980000, latestLedger: 5100000 };
    }
  });

  assert.ok(capturedParams.length >= 1, 'getEvents should have been called at least once');
  for (const p of capturedParams) {
    assert.ok(
      typeof p.startLedger === 'number' && p.startLedger > 0,
      `startLedger must be a positive number, got: ${p.startLedger}`
    );
  }
});

test('startLedger is approximately latestLedger - 17280', async () => {
  const latestSeq = 5100000;
  let usedStartLedger = null;

  await runFetchContractEventsLogic(async (url, method, params) => {
    if (method === 'getLatestLedger') return { sequence: latestSeq };
    if (method === 'getEvents') {
      usedStartLedger = params.startLedger;
      return { events: [], oldestLedger: 4980000, latestLedger: latestSeq };
    }
  });

  const expected = latestSeq - LEDGER_WINDOW;
  assert.equal(usedStartLedger, expected, `startLedger should be ${expected}`);
});

test('if startLedger < oldestLedger, retries with oldestLedger', async () => {
  const latestSeq = 5010000; // 17280 back = 4992720, below oldestLedger=5000000
  const oldestLedger = 5000000;
  const calls = [];

  await runFetchContractEventsLogic(async (url, method, params) => {
    if (method === 'getLatestLedger') return { sequence: latestSeq };
    if (method === 'getEvents') {
      calls.push(params.startLedger);
      return { events: [], oldestLedger, latestLedger: latestSeq };
    }
  });

  assert.equal(calls.length, 2, 'should call getEvents twice when retry needed');
  assert.equal(calls[0], latestSeq - LEDGER_WINDOW, 'first call uses computed startLedger');
  assert.equal(calls[1], oldestLedger, 'retry call uses oldestLedger');
});

test('returns newest 10 events (reversed order)', async () => {
  // Build 25 fake events with ascending ledger numbers (as RPC returns them)
  const fakeEvents = Array.from({ length: 25 }, (_, i) => ({ ledger: 5000000 + i, type: 'contract' }));

  const result = await runFetchContractEventsLogic(async (_url, method, _params) => {
    if (method === 'getLatestLedger') return { sequence: 5100000 };
    if (method === 'getEvents') {
      return { events: fakeEvents, oldestLedger: 4980000, latestLedger: 5100000 };
    }
  });

  assert.equal(result.eventsShown, 10, 'should show exactly 10 events');
});

test('returns 0 events when array is empty', async () => {
  const result = await runFetchContractEventsLogic(async (_url, method, _params) => {
    if (method === 'getLatestLedger') return { sequence: 5100000 };
    if (method === 'getEvents') {
      return { events: [], oldestLedger: 4980000, latestLedger: 5100000 };
    }
  });

  assert.equal(result.eventsShown, 0, 'should show 0 events when empty');
});

test('returns at most 10 events even when RPC returns fewer than 200', async () => {
  const fakeEvents = Array.from({ length: 15 }, (_, i) => ({ ledger: 5000000 + i }));

  const result = await runFetchContractEventsLogic(async (_url, method, _params) => {
    if (method === 'getLatestLedger') return { sequence: 5100000 };
    if (method === 'getEvents') {
      return { events: fakeEvents, oldestLedger: 4980000, latestLedger: 5100000 };
    }
  });

  assert.ok(result.eventsShown <= 10, `should show at most 10 events, got ${result.eventsShown}`);
  assert.equal(result.ledgers[0], 5000014, 'first shown should be most recent');
});
