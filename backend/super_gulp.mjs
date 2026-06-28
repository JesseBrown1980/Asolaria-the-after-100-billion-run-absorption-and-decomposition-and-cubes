// super_gulp plane — bulk_intake: bulk-batched intake (window 2000+).
// BPI frames only, no JSON-on-wire. ESM.
//
// Frames:
//   SGP|<room_id>|<payload_sha16>|<window_size>|<sha8>     ingest envelope
//   SGF|<flush_count>|<record_count>|<batch_sha16>|<ts_ms>|<sha8>  flush envelope

import crypto from 'node:crypto';
import { encodeFrame } from '../bpi-codec.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

// Flow envelope (operator canon 2026-06-10): 2000/50k are the runtime PRESSURE ENVELOPE,
// not limits to raise. Env knob keeps ONE federation-wide dial (name parity with liris);
// DEFAULT IS UNCHANGED 2000 so behavior is byte-identical unless operator sets the env var.
const MAX_WINDOW = parseInt(process.env.BEHCS_GC_TRIGGER_MESSAGES || '2000', 10);
// 50k super-tier ceiling: the hard cap above the 2000 flush window. A force-flush backstop
// so a stuck flush can never let the buffer exceed the envelope. Default 50000 = the canon ceiling.
const SUPER_GULP_CEILING = parseInt(process.env.BEHCS_GC_SUPER_CEILING || '50000', 10);

let _window = [];
let _flush_count = 0;
let _total_ingested = 0;
let _last_flush_ts = 0;
let _ceiling_forced_flushes = 0;

export function sgIngest({ room_id, payload_sha16 }) {
  const rec = { ts: Date.now(), room_id, payload_sha16 };
  _window.push(rec);
  _total_ingested++;
  const enriched = enrichEnvelope({
    room_id: Number(room_id) || 0,
    ts_ms: rec.ts,
    job_seq: _total_ingested,
    proof: payload_sha16,
  });
  const frame = encodeFrame('SGP', [
    room_id,
    payload_sha16,
    _window.length,
    enriched.polar_quant,
    enriched.turbo_quant,
    enriched.js_quant,
    enriched.triple_quant,
    enriched.evidence_quant,
    enriched.authority_quant,
  ]);
  if (_window.length >= MAX_WINDOW) sgFlush();
  // 50k super-tier backstop: if a flush ever stalls, force-flush at the ceiling so the
  // live buffer can never exceed the envelope. Normal path flushes at MAX_WINDOW (2000) first;
  // this only fires if that didn't drain. Preserves the canon "never more than 50k" invariant.
  if (_window.length >= SUPER_GULP_CEILING) { _ceiling_forced_flushes++; sgFlush(); }
  return frame;
}

export function sgFlush() {
  const batch = _window.splice(0, _window.length);
  const record_count = batch.length;
  const concat = batch.map((r) => `${r.ts}:${r.room_id}:${r.payload_sha16}`).join('|');
  const batch_sha16 = crypto.createHash('sha256').update(concat).digest('hex').slice(0, 16);
  _flush_count++;
  _last_flush_ts = Date.now();
  const enriched = enrichEnvelope({
    ts_ms: _last_flush_ts,
    job_seq: _flush_count,
    stdout_len: record_count,
    ok: 1,
    proof: batch_sha16,
  });
  return encodeFrame('SGF', [
    _flush_count,
    record_count,
    batch_sha16,
    _last_flush_ts,
    enriched.polar_quant,
    enriched.turbo_quant,
    enriched.js_quant,
    enriched.triple_quant,
    enriched.evidence_quant,
    enriched.authority_quant,
  ]);
}

export function state() {
  return {
    plane: 'super_gulp',
    window_size: _window.length,
    max_window: MAX_WINDOW,
    super_gulp_ceiling: SUPER_GULP_CEILING,
    ceiling_forced_flushes: _ceiling_forced_flushes,
    env_knob: 'BEHCS_GC_TRIGGER_MESSAGES',
    total_ingested: _total_ingested,
    flush_count: _flush_count,
    last_flush_ts: _last_flush_ts,
  };
}

export function selfTest() {
  sgIngest({ room_id: 1, payload_sha16: 'aaaaaaaaaaaaaaaa' });
  sgIngest({ room_id: 2, payload_sha16: 'bbbbbbbbbbbbbbbb' });
  sgIngest({ room_id: 3, payload_sha16: 'cccccccccccccccc' });
  const frame = sgFlush();
  return { ok: true, flush_count: _flush_count, frame_len: frame.length };
}

// wire(bus): self-register subscriptions when conductor loads this plane.
// Defensive no-op if bus is missing or lacks a register() method.
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('super_gulp', 'sgIngest', (tuple, _ctx) => sgIngest(tuple));
  bus.register('super_gulp', 'sgFlush', (_tuple, _ctx) => sgFlush());
}
