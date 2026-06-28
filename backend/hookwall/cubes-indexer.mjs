// ============================================================================
// Lineage: derived from Dan Edens' 6-hook bundle (Madness Interactive / madnessinteractive.cc).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// cubes-indexer.mjs — Map every PID into N-dimensional cube space.
// D25 MODALITY, D26 OMNIDIRECTIONAL, D33 SYMBOL_MULTIPLEX, D34 CROSS_COLONY, D10 mixed.
// Each PID gets a cube coordinate tuple: { D25, D26, D33, D34, D10 } = 6-glyph hilbertAddress.

import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CUBE_DIMS = [25, 26, 33, 34, 10];

// Wave-3 ARES amend: additive v2 dims behind opt-in flag (THEMIS-gated).
// D04 AUTHORITY-TIER, D11 LEVEL, D17 PORT are NOT yet BEHCS-1024 alphabet dims —
// descriptor-only until Hermes cosign row mints the canonical Dnn allocation.
export const CUBE_DIMS_V2 = [4, 10, 11, 17, 25, 26, 33, 34];

// Dimension-name lookup (D25 MODALITY, etc.) for prefixing the address key.
const DIM_NAMES = {
  4: 'AUTHORITY_TIER',
  10: 'TIME',
  11: 'LEVEL',
  17: 'PORT',
  25: 'MODALITY',
  26: 'OMNIDIRECTIONAL',
  33: 'SYMBOL_MULTIPLEX',
  34: 'CROSS_COLONY',
};

// v2 dims that are descriptor-only (not yet cosign-promoted).
const V2_DESCRIPTOR_ONLY_DIMS = new Set([4, 11, 17]);

function v2EnvActive() {
  return process.env.CUBE_DIMS_V2 === '1' || process.env.CUBE_DIMS_V2 === 'true';
}

// Try codex-bridge.js (CJS) via createRequire. Fall back to sha256-hex slice.
let _hilbertAddress = null;
try {
  const require = createRequire(import.meta.url);
  const bridgePath = path.resolve(
    __dirname,
    '../../../../tmp/aether-behcs-256-bundle/tools/behcs/codex-bridge.js',
  );
  const bridge = require(bridgePath);
  if (bridge && typeof bridge.hilbertAddress === 'function') {
    _hilbertAddress = bridge.hilbertAddress;
    // Hydrate canonical dim names from catalogByD when available.
    if (bridge.catalogByD) {
      // Hydrate names for the union of v1+v2 dims so v2-active state() reports
      // canonical names where catalog defines them.
      const _union = new Set([...CUBE_DIMS, ...CUBE_DIMS_V2]);
      for (const d of _union) {
        const c = bridge.catalogByD[d];
        if (c && c.name) DIM_NAMES[d] = c.name;
      }
    }
  }
} catch (_) {
  _hilbertAddress = null;
}

// Fallback: sha256-hex, first 6 hex pairs joined.
function sha256Hex6(key) {
  const h = createHash('sha256').update(String(key)).digest('hex');
  // 6 glyph slots, each 2 hex chars = 12 hex chars total.
  return h.slice(0, 12);
}

function hilbertAddr(key) {
  return _hilbertAddress ? _hilbertAddress(key) : sha256Hex6(key);
}

// ---- core API ----

function _activeDims(v2) {
  return v2 ? CUBE_DIMS_V2 : CUBE_DIMS;
}

export function cubeCoordsForPid(pid, opts = {}) {
  const v2 = opts.v2 === true || (opts.v2 !== false && v2EnvActive());
  const dims = _activeDims(v2);
  const coords = {};
  for (const d of dims) {
    const name = DIM_NAMES[d] || `D${d}`;
    coords[`D${d}`] = hilbertAddr(`${name}:${pid}`);
  }
  return coords;
}

// In-memory storage.
const _pidCoords = new Map();           // pid -> coords dict
const _reverse = new Map();             // 'D25' -> Map(coord -> Set(pid))

for (const d of CUBE_DIMS) _reverse.set(`D${d}`, new Map());
// Pre-allocate reverse buckets for v2 dims too (cheap, empty until used).
for (const d of CUBE_DIMS_V2) {
  if (!_reverse.has(`D${d}`)) _reverse.set(`D${d}`, new Map());
}

export function indexPid(pid, opts = {}) {
  const v2 = opts.v2 === true || (opts.v2 !== false && v2EnvActive());
  const dims = _activeDims(v2);
  const coords = cubeCoordsForPid(pid, { v2 });
  // Preserve prior coords for back-compat: merge rather than overwrite so old
  // 5-dim PIDs keep their 5-dim coords when re-indexed under v2.
  const prior = _pidCoords.get(pid) || {};
  const merged = { ...prior, ...coords };
  _pidCoords.set(pid, merged);
  for (const d of dims) {
    const k = `D${d}`;
    let bucket = _reverse.get(k);
    if (!bucket) {
      bucket = new Map();
      _reverse.set(k, bucket);
    }
    let set = bucket.get(coords[k]);
    if (!set) {
      set = new Set();
      bucket.set(coords[k], set);
    }
    set.add(pid);
  }
  return coords;
}

export function lookupCube(D, coord) {
  const k = typeof D === 'string' && D.startsWith('D') ? D : `D${D}`;
  const bucket = _reverse.get(k);
  if (!bucket) return [];
  const set = bucket.get(coord);
  return set ? Array.from(set) : [];
}

export function state() {
  const v2Active = v2EnvActive();
  const reportDims = v2Active ? CUBE_DIMS_V2 : CUBE_DIMS;
  const dims = {};
  for (const d of reportDims) {
    const k = `D${d}`;
    const bucket = _reverse.get(k);
    dims[k] = {
      name: DIM_NAMES[d] || k,
      buckets: bucket ? bucket.size : 0,
      descriptor_only: V2_DESCRIPTOR_ONLY_DIMS.has(d) || undefined,
    };
  }
  return {
    ok: true,
    spec: v2Active ? 'cubes-indexer-v2' : 'cubes-indexer-v1',
    backend: _hilbertAddress ? 'codex-bridge' : 'sha256-fallback',
    cube_dims: v2Active ? CUBE_DIMS_V2 : CUBE_DIMS,
    v1_dims: CUBE_DIMS,
    v2_dims: CUBE_DIMS_V2,
    v2_active: v2Active,
    v2_descriptors_only: true,
    v2_descriptor_dims: Array.from(V2_DESCRIPTOR_ONLY_DIMS),
    indexed_pids: _pidCoords.size,
    dims,
  };
}

export function selfTest() {
  const sample = [
    'ACER-PID-H740C-A07-W104-P00-N00000',
    'OP-PEER-PID-G0000-A00-W000-P00-N00000',
    'AGT-SHANNON-PID-HD16C-A04-W1024-P01',
  ];
  const out = { ok: true, indexed: [], lookup: [] };
  for (const pid of sample) {
    const coords = indexPid(pid);
    out.indexed.push({ pid, coords });
  }
  for (const pid of sample) {
    for (const d of CUBE_DIMS) {
      const k = `D${d}`;
      const coord = _pidCoords.get(pid)[k];
      const hits = lookupCube(k, coord);
      if (!hits.includes(pid)) {
        out.ok = false;
        out.lookup.push({ pid, dim: k, coord, hits, fail: true });
      } else {
        out.lookup.push({ pid, dim: k, coord, hit_count: hits.length });
      }
    }
  }
  out.state = state();
  return out;
}

// Direct invocation: print self-test as JSON to stdout (CLI only, not on wire).
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = selfTest();
  process.stdout.write(JSON.stringify(r, null, 2) + '\n');
}
