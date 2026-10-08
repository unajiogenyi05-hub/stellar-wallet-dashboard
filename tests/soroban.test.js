/**
 * tests/soroban.test.js — Unit tests for Soroban strkey/XDR helpers in app.js.
 *
 * Tests the two fixed bugs:
 *   a) strKeyToBytes: version byte 0x10 (not 0x02), CRC16-XModem validation
 *   b) buildContractInstanceKey: ScVal discriminant 20 (not 11)
 *
 * Run with: node --test tests/soroban.test.js
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Helpers replicated from app.js (pure functions, no DOM/window) ────────────

/** CRC16-XModem: poly=0x1021, init=0, used by Stellar strkeys. */
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
  if (bytes.length !== 35) return null;
  if (bytes[0] !== 0x10) return null;
  const storedCrc = bytes[33] | (bytes[34] << 8);
  const computedCrc = crc16xmodem(bytes.slice(0, 33));
  if (storedCrc !== computedCrc) return null;
  return new Uint8Array(bytes.slice(1, 33));
}

function buildContractInstanceKey(contractHash) {
  const buf = new Uint8Array(48);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 6);
  view.setUint32(4, 1);
  buf.set(contractHash, 8);
  view.setUint32(40, 20); // scvLedgerKeyContractInstance = 20
  view.setUint32(44, 1);  // persistent = 1
  return Buffer.from(buf).toString('base64');
}

// ── strKeyToBytes ─────────────────────────────────────────────────────────────

test('strKeyToBytes: valid contract ID decodes to 32 bytes', async () => {
  const SDK = await import('@stellar/stellar-sdk');
  const contractBytes = Buffer.alloc(32, 0xab);
  const contractId = SDK.StrKey.encodeContract(contractBytes);

  const result = strKeyToBytes(contractId);
  assert.ok(result instanceof Uint8Array, 'result should be Uint8Array');
  assert.equal(result.length, 32, 'result should be 32 bytes');
  // All bytes should be 0xab
  for (let i = 0; i < 32; i++) {
    assert.equal(result[i], 0xab, `byte ${i} should be 0xab`);
  }
});

test('strKeyToBytes: returns null for wrong prefix (G...)', () => {
  const gAddress = 'GAAHI26FKE6MGJFD2BLJOPN7UDZMTMKAITAFPZA4MSQRBGSIPVRGBYFK';
  assert.equal(strKeyToBytes(gAddress), null);
});

test('strKeyToBytes: returns null for wrong length', () => {
  // Too short
  assert.equal(strKeyToBytes('CABC'), null);
  // Too long (57 chars)
  assert.equal(strKeyToBytes('C' + 'A'.repeat(56)), null);
});

test('strKeyToBytes: returns null for bad checksum', async () => {
  const SDK = await import('@stellar/stellar-sdk');
  const contractBytes = Buffer.alloc(32, 0xcd);
  const contractId = SDK.StrKey.encodeContract(contractBytes);

  // Flip one character to corrupt the CRC
  const corrupted = contractId.slice(0, -2) + (contractId[contractId.length - 2] === 'A' ? 'B' : 'A') + contractId.slice(-1);
  // The corrupted version may still be 56 chars but has wrong CRC
  const result = strKeyToBytes(corrupted);
  assert.equal(result, null, 'corrupted checksum should return null');
});

test('strKeyToBytes: returns null for invalid base32 character', () => {
  // '0' and '1' are not in the base32 alphabet (ABCDEFGHIJKLMNOPQRSTUVWXYZ234567)
  const badChar = 'C' + '0'.repeat(55);
  assert.equal(strKeyToBytes(badChar), null);
});

// ── buildContractInstanceKey ──────────────────────────────────────────────────

test('buildContractInstanceKey: output matches SDK xdr.LedgerKey base64', async () => {
  const SDK = await import('@stellar/stellar-sdk');
  const contractBytes = Buffer.alloc(32, 0xab);
  const contractId = SDK.StrKey.encodeContract(contractBytes);

  // Build key using SDK
  const contractObj = new SDK.Contract(contractId);
  const addr = contractObj.address().toScAddress();
  const ledgerKey = SDK.xdr.LedgerKey.contractData(
    new SDK.xdr.LedgerKeyContractData({
      contract: addr,
      key: SDK.xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: SDK.xdr.ContractDataDurability.persistent,
    })
  );
  const sdkBase64 = ledgerKey.toXDR('base64');

  // Build key using our function
  const hashBytes = strKeyToBytes(contractId);
  const ourBase64 = buildContractInstanceKey(hashBytes);

  assert.equal(ourBase64, sdkBase64, 'manual XDR key should match SDK-built key');
});

test('buildContractInstanceKey: ScVal discriminant is 20 (scvLedgerKeyContractInstance)', () => {
  const contractBytes = new Uint8Array(32).fill(0x01);
  const base64 = buildContractInstanceKey(contractBytes);
  const buf = Buffer.from(base64, 'base64');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const scvalDiscriminant = view.getUint32(40);
  assert.equal(scvalDiscriminant, 20, 'ScVal discriminant at offset 40 must be 20');
});

test('buildContractInstanceKey: LedgerKey discriminant is 6 (contractData)', () => {
  const contractBytes = new Uint8Array(32).fill(0x01);
  const base64 = buildContractInstanceKey(contractBytes);
  const buf = Buffer.from(base64, 'base64');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const lkDiscriminant = view.getUint32(0);
  assert.equal(lkDiscriminant, 6, 'LedgerKey discriminant at offset 0 must be 6');
});

test('buildContractInstanceKey: durability is 1 (persistent)', () => {
  const contractBytes = new Uint8Array(32).fill(0x01);
  const base64 = buildContractInstanceKey(contractBytes);
  const buf = Buffer.from(base64, 'base64');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const durability = view.getUint32(44);
  assert.equal(durability, 1, 'durability at offset 44 must be 1 (persistent)');
});
