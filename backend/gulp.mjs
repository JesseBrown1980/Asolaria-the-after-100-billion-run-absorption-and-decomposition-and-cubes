// Plane: gulp / role: intake / purpose: per-room intake buffer.
// Compact ring buffers keyed by room_id; emits BPI 'GLP' frames on ingest.
// Window size 64 per room (active_window_size from manifest).

import crypto from 'node:crypto';
import { encodeFrame } from '../bpi-codec.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

const MAX_PER_ROOM = 64;
const _buffers = new Map(); // room_id -> [{ ts_ms, payload_sha16 }]

function payloadSha16(envelope) {
  const body = typeof envelope === 'string' ? envelope : JSON.stringify(envelope ?? '');
  return crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
}

export function gulpIngest({ room_id, envelope }) {
  if (room_id == null) throw new Error('gulpIngest: room_id required');
  let buf = _buffers.get(room_id);
  if (!buf) { buf = []; _buffers.set(room_id, buf); }
  const rec = { ts_ms: Date.now(), payload_sha16: payloadSha16(envelope) };
  buf.push(rec);
  while (buf.length > MAX_PER_ROOM) buf.shift();
  const base = (envelope && typeof envelope === 'object') ? { ...envelope } : {};
  if (base.room_id == null) base.room_id = Number(room_id) || 0;
  if (base.ts_ms == null) base.ts_ms = rec.ts_ms;
  if (base.proof == null) base.proof = rec.payload_sha16;
  const enriched = enrichEnvelope(base);
  return encodeFrame('GLP', [
    room_id,
    rec.payload_sha16,
    buf.length,
    enriched.polar_quant,
    enriched.turbo_quant,
    enriched.js_quant,
    enriched.triple_quant,
    enriched.evidence_quant,
    enriched.authority_quant,
  ]);
}

export function gulpDrain(roomId, n = 100) {
  const buf = _buffers.get(roomId);
  if (!buf || buf.length === 0) return [];
  const take = Math.min(n, buf.length);
  return buf.splice(0, take);
}

export function state() {
  let total = 0;
  let rooms = 0;
  for (const buf of _buffers.values()) {
    if (buf.length > 0) { rooms++; total += buf.length; }
  }
  return {
    plane: 'gulp',
    buffered_total: total,
    rooms_buffering: rooms,
    max_per_room: MAX_PER_ROOM,
  };
}

export function selfTest() {
  const room = `selftest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const env = { provider: 'selftest', payload: 'gulp-plane-probe', n: 1 };
  const frame = gulpIngest({ room_id: room, envelope: env });
  const drained = gulpDrain(room, 100);
  return { ok: true, drained_count: drained.length, frame_len: frame.length };
}

// wire(bus): self-register subscriptions when conductor loads this plane.
// Defensive no-op if bus is missing or lacks a register() method.
// gulpFlush maps to existing gulpDrain surface (drain == flush per room).
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('gulp', 'gulpIngest', (tuple, _ctx) => gulpIngest(tuple));
  bus.register('gulp', 'gulpFlush', (tuple, _ctx) =>
    gulpDrain(tuple && tuple.room_id, (tuple && tuple.n) || 100));
}
