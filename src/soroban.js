/**
 * src/soroban.js — Soroban XDR helpers for Stellar Wallet Dashboard.
 *
 * Uses @stellar/stellar-sdk loaded as window.StellarSdk from the CDN.
 * All functions degrade gracefully if the SDK is not available.
 *
 * SDK v17 XDR objects use property access (not method calls):
 *   ledgerData.type         → 'contractData' | 'contractCode'
 *   ledgerData.contractData → LedgerKeyContractData object
 *   contractData.val        → ScVal object
 *   scVal.type              → ScValType string
 *   scVal.instance          → ScContractInstance (when type='contractInstance')
 *   instance.executable     → ScContractExecutable
 *   executable.type         → 'contractExecutableWasm' | 'contractExecutableStellarAsset'
 *   executable.wasmHash     → Uint8Array (when type='contractExecutableWasm')
 */

import { escapeHtml, formatNative, truncateMiddle } from './utils.js';

/**
 * Returns a human-readable label for an XDR ScVal type.
 * @param {object} scVal
 * @returns {string}
 */
export function xdrValTypeLabel(scVal) {
  try {
    const name = scVal && scVal.type;
    return name ? `<${name}>` : '<unknown ScVal type>';
  } catch (_) {
    return '<unknown ScVal type>';
  }
}

/**
 * Decode a base64 XDR LedgerEntryData returned by getLedgerEntries.
 *
 * Returns an object with:
 *  - `decoded` {string} — human-readable representation
 *  - `wasmHash` {string|null} — 64-char hex wasm hash (wasm instance entries only)
 *
 * Falls back to a truncated raw XDR string if the SDK is not available.
 *
 * @param {string} xdrBase64 — base64-encoded XDR LedgerEntryData
 * @param {'instance'|'data'|'code'|string} entryType
 * @returns {{ decoded: string, wasmHash: string|null }}
 */
export function decodeXdrEntry(xdrBase64, entryType) {
  const sdk = (typeof window !== 'undefined') ? window.StellarSdk : undefined;
  if (!sdk) {
    return {
      decoded: `(SDK not loaded) ${truncateMiddle(xdrBase64, 30, 30)}`,
      wasmHash: null,
    };
  }

  let wasmHash = null;

  try {
    const ledgerData = sdk.xdr.LedgerEntryData.fromXDR(xdrBase64, 'base64');

    // SDK v17: ledgerData.type is a string ('contractData', 'contractCode', etc.)
    const arm = ledgerData.type;

    if (arm === 'contractData') {
      const contractData = ledgerData.contractData;
      const val = contractData.val;

      if (entryType === 'instance') {
        // Instance entry: val.type === 'contractInstance'
        // val.instance is ScContractInstance
        try {
          const instance = val.instance;
          if (instance) {
            const exec = instance.executable;
            if (exec && exec.type === 'contractExecutableWasm' && exec.wasmHash) {
              wasmHash = Array.from(exec.wasmHash)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            }

            const storage = instance.storage;
            const storageEntries = storage ? storage.length : 0;

            const execLabel = exec && exec.type === 'contractExecutableStellarAsset'
              ? 'stellar_asset (no wasm)'
              : wasmHash
                ? `wasm: ${wasmHash.slice(0, 16)}\u2026`
                : '(wasm hash unavailable)';

            const decoded = `instance (${execLabel}, ${storageEntries} storage entries)`;
            return { decoded, wasmHash };
          }
        } catch (_) {
          // fall through to scValToNative
        }
      }

      // Non-instance or fallback: try scValToNative
      try {
        const native = sdk.scValToNative(val);
        return { decoded: formatNative(native), wasmHash };
      } catch (_) {
        return { decoded: xdrValTypeLabel(val), wasmHash };
      }
    }

    if (arm === 'contractCode') {
      return { decoded: '(contract WASM code entry)', wasmHash };
    }

    // Generic fallback: try scValToNative on the raw base64
    try {
      const scVal = sdk.xdr.ScVal.fromXDR(xdrBase64, 'base64');
      const native = sdk.scValToNative(scVal);
      return { decoded: formatNative(native), wasmHash };
    } catch (_) {
      return { decoded: truncateMiddle(xdrBase64, 30, 30), wasmHash };
    }
  } catch (_) {
    return {
      decoded: `(SDK not loaded) ${truncateMiddle(xdrBase64, 30, 30)}`,
      wasmHash: null,
    };
  }
}

/**
 * Decode a Soroban RPC `getEvents` response entry for display.
 *
 * @param {object} event — one entry from getEvents result.events[]
 * @returns {{ topic: string, value: string, contractId: string, type: string }}
 */
export function decodeEvent(event) {
  const sdk = (typeof window !== 'undefined') ? window.StellarSdk : undefined;

  const contractId = event.contractId || '(unknown)';
  const type = event.type || 'contract';

  if (!sdk) {
    const topicRaw = Array.isArray(event.topic)
      ? event.topic.map((t) => truncateMiddle(t, 12, 12)).join(', ')
      : String(event.topic || '');
    const valueRaw = truncateMiddle((event.value && event.value.xdr) || '', 20, 20);
    return {
      contractId,
      type,
      topic: `(SDK not loaded) ${escapeHtml(topicRaw)}`,
      value: `(SDK not loaded) ${escapeHtml(valueRaw)}`,
    };
  }

  let topicStr = '';
  try {
    topicStr = (event.topic || [])
      .map((xdr64) => {
        try {
          const val = sdk.xdr.ScVal.fromXDR(xdr64, 'base64');
          return formatNative(sdk.scValToNative(val));
        } catch (_) {
          return truncateMiddle(xdr64, 12, 12);
        }
      })
      .join(', ');
  } catch (_) {
    topicStr = '(decode error)';
  }

  let valueStr = '';
  try {
    const valXdr = event.value && event.value.xdr;
    if (valXdr) {
      const val = sdk.xdr.ScVal.fromXDR(valXdr, 'base64');
      valueStr = formatNative(sdk.scValToNative(val));
    }
  } catch (_) {
    valueStr = '(decode error)';
  }

  return {
    contractId,
    type,
    topic: escapeHtml(topicStr),
    value: escapeHtml(valueStr),
  };
}
