// hermes-disc/gulp-bridge.mjs
// Bridge: revolver HBPv1 emits -> gulp plane (per-room window=64) + super_gulp plane (window=2000)
// BEFORE they reach hookwall / file-sidecar / bus. No JSON on wire (planes emit BPI frames).
// ESM. <=130 lines.

import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { gulpIngest, gulpDrain, state as gulpState } from '../planes/gulp.mjs';
import { sgIngest, sgFlush, state as sgState } from '../planes/super_gulp.mjs';

// One federation-wide dial (name parity with liris). DEFAULT UNCHANGED 2000 — mirrors
// super_gulp MAX_WINDOW so the two planes index the same envelope under the same threshold.
const SG_THRESHOLD = parseInt(process.env.BEHCS_GC_TRIGGER_MESSAGES || '2000', 10);

// payload_sha16 — must match gulp.mjs/payloadSha16 byte-for-byte so the
// two planes index the same envelope under the same digest.
function payloadSha16(envelope) {
  const body = typeof envelope === 'string' ? envelope : JSON.stringify(envelope ?? '');
  return crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
}

let _bridged_total = 0;
let _last_sg_frame = null;

/**
 * Push one envelope through both planes in a single call.
 * @returns {{glp_frame: string, sgp_frame: string}}
 */
export function gulpBridge({ room_id, envelope }) {
  if (room_id == null) throw new Error('gulpBridge: room_id required');
  const sha16 = payloadSha16(envelope);
  const glp_frame = gulpIngest({ room_id, envelope });
  const sgp_frame = sgIngest({ room_id, payload_sha16: sha16 });
  _bridged_total++;
  return { glp_frame, sgp_frame };
}

/**
 * Drain up to `n` records from the gulp buffer for `roomId`.
 * @returns {Array<{ts_ms:number, payload_sha16:string}>}
 */
export function gulpFlush(roomId, n = 64) {
  return gulpDrain(roomId, n);
}

/**
 * Check super_gulp threshold; if the window is at/above SG_THRESHOLD,
 * trigger sgFlush() and return the SGF frame. Otherwise return null.
 */
export function superGulpFlushIfFull() {
  const s = sgState();
  if (s.window_size >= SG_THRESHOLD) {
    _last_sg_frame = sgFlush();
    return _last_sg_frame;
  }
  return null;
}

/**
 * Combined stats — single object covering both planes plus bridge counters.
 */
export function state() {
  return {
    plane: 'gulp-bridge',
    bridged_total: _bridged_total,
    last_sg_frame_len: _last_sg_frame ? _last_sg_frame.length : 0,
    gulp: gulpState(),
    super_gulp: sgState(),
  };
}

/**
 * selfTest — push 5 envelopes through the bridge, drain, return frame counts.
 */
export function selfTest() {
  const room = `bridge-selftest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const frames = [];
  for (let i = 0; i < 5; i++) {
    const env = { provider: 'gulp-bridge-selftest', payload: `probe-${i}`, n: i };
    const { glp_frame, sgp_frame } = gulpBridge({ room_id: room, envelope: env });
    frames.push({ glp_len: glp_frame.length, sgp_len: sgp_frame.length });
  }
  const drained = gulpFlush(room, 64);
  const sg = superGulpFlushIfFull(); // not full at 5, expect null
  return {
    ok: true,
    pushed: frames.length,
    drained_count: drained.length,
    glp_frames: frames.map((f) => f.glp_len),
    sgp_frames: frames.map((f) => f.sgp_len),
    sg_flushed_now: sg ? sg.length : 0,
    state: state(),
  };
}

// Standalone CLI invocation: `node gulp-bridge.mjs` runs selfTest and prints result.
// pathToFileURL gives the correct `file:///C:/...` form; the old `file://${path}` produced
// `file://C:/...` and never matched on Windows (CLI block silently skipped).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = selfTest();
  process.stdout.write(`gulp-bridge selfTest ok=${r.ok} pushed=${r.pushed} drained=${r.drained_count} bridged_total=${r.state.bridged_total}\n`);
}
