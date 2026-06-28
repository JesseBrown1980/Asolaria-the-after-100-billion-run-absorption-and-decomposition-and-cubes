// ============================================================================
// Lineage: derived from Dan Edens' 6-hook bundle (Madness Interactive / madnessinteractive.cc).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// promotion-bridge.mjs — Hermes-style descriptor→live promotion receipts.
// Default DENY (describe_only); only quintuple-auth grants. Wraps hookwall +
// white_room planes. BPI frames on-wire (no JSON keys), stdlib only.
// Frames: 'PRO' REQUESTED, 'PRA' APPROVED|DENIED, 'PRV' REVOKED.

import crypto from 'node:crypto';
import { encodeFrame } from '../bpi-codec.mjs';
import { requestLive, grantLive } from '../planes/hookwall.mjs';
import { requestReview, markReviewed } from '../planes/white_room.mjs';
import { approvalGuard, checkLiveAck, recordLiveAck as _danRecordLiveAck, _liveAckTestReset } from './dan-hooks-approval-guard.mjs';
import { classifyTier } from './tier-classifier.mjs';

const REQUESTED = 'REQUESTED';
const APPROVED = 'APPROVED';
const DENIED = 'DENIED';
const REVOKED = 'REVOKED';

const _requests = new Map();
let _counters = { requested: 0, approved: 0, denied: 0, revoked: 0 };

function mintRequestId(pid, field, scope) {
  const seed = `${pid}|${field}|${scope}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

function intentOf(pid, field, scope) {
  return `promote:${pid}:${field}:${scope}`;
}

function reviewPayload(requestId, rec) {
  return { request_id: requestId, pid: rec.pid, field: rec.field, scope: rec.scope, reason: rec.reason };
}

function reviewSha16(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

export function requestPromotion({ pid, field, scope, reason }) {
  if (!pid || !field || !scope) throw new Error('requestPromotion: pid, field, scope required');
  const request_id = mintRequestId(pid, field, scope);
  const ts = Date.now();
  const denial = requestLive(0, intentOf(pid, field, scope));
  const rec = { pid, field, scope, reason: reason || '', status: REQUESTED, frames: {}, signers: [], ts };
  const wrFrame = requestReview(reviewPayload(request_id, rec), 'high', 'promotion-bridge');
  const proFrame = encodeFrame('PRO', [request_id, pid, field, scope, REQUESTED, ts]);
  rec.frames.PRO = proFrame;
  rec.frames.HKW = denial.frame;
  rec.frames.WHR = wrFrame;
  _requests.set(request_id, rec);
  _counters.requested++;
  return { request_id, status: REQUESTED };
}

export function approvePromotion(requestId, signers) {
  const rec = _requests.get(requestId);
  if (!rec) throw new Error(`approvePromotion: unknown request_id ${requestId}`);
  const sig = Array.isArray(signers) ? signers.filter((s) => typeof s === 'string' && s.length > 0) : [];
  const quintuple = sig.length >= 5;
  const ts = Date.now();
  // Wave-S2-C wiring (2026-05-19): SECRET-tier live-ack gate. Classify the
  // request's (field, scope); for tiers whose SIGNER_MATRIX row carries
  // operator_keyboard_live_ack_seconds>0 (currently SECRET=600s), demand a
  // recorded live-ack frame inside that window BEFORE running the 5-signer
  // check. Lower tiers fall through unchanged.
  const tier = classifyTier(rec.field, rec.scope);
  rec.tier = tier;
  approvalGuard(intentOf(rec.pid, rec.field, rec.scope), tier); // emits hbp row, no decision
  const liveAck = checkLiveAck(requestId, tier, ts);
  if (liveAck.live_ack_required && !liveAck.ok) {
    const reason = liveAck.reason || 'LIVE_ACK_MISSING_OR_EXPIRED';
    const praFrame = encodeFrame('PRA', [requestId, rec.pid, rec.field, rec.scope, DENIED, sig.length, ts, reason]);
    rec.status = DENIED;
    rec.signers = sig;
    rec.deny_reason = reason;
    rec.frames.PRA = praFrame;
    _counters.denied++;
    return { request_id: requestId, status: DENIED, signer_count: sig.length, reason, tier };
  }
  const hk = grantLive(0, intentOf(rec.pid, rec.field, rec.scope), { signers: sig, window_ok: quintuple });
  if (!quintuple || !hk.granted) {
    const praFrame = encodeFrame('PRA', [requestId, rec.pid, rec.field, rec.scope, DENIED, sig.length, ts]);
    rec.status = DENIED;
    rec.signers = sig;
    rec.frames.PRA = praFrame;
    rec.frames.HKG = hk.frame;
    _counters.denied++;
    return { request_id: requestId, status: DENIED, signer_count: sig.length };
  }
  const wrSha = reviewSha16(reviewPayload(requestId, rec));
  const reviewedFrame = markReviewed(wrSha, 'approved');
  const praFrame = encodeFrame('PRA', [requestId, rec.pid, rec.field, rec.scope, APPROVED, sig.length, ts]);
  rec.status = APPROVED;
  rec.signers = sig;
  rec.frames.PRA = praFrame;
  rec.frames.HKG = hk.frame;
  rec.frames.WHC = reviewedFrame;
  rec.payload_sha = wrSha;
  _counters.approved++;
  return { request_id: requestId, status: APPROVED, signer_count: sig.length };
}

export function revokePromotion(requestId) {
  const rec = _requests.get(requestId);
  if (!rec) throw new Error(`revokePromotion: unknown request_id ${requestId}`);
  const ts = Date.now();
  const prvFrame = encodeFrame('PRV', [requestId, rec.pid, rec.field, rec.scope, REVOKED, ts]);
  rec.status = REVOKED;
  rec.frames.PRV = prvFrame;
  _counters.revoked++;
  return { request_id: requestId, status: REVOKED };
}

export function getPromotion(requestId) {
  const rec = _requests.get(requestId);
  if (!rec) return null;
  return { request_id: requestId, ...rec };
}

export function state() {
  return {
    plane: 'promotion-bridge',
    tracked: _requests.size,
    ..._counters,
    default_policy: 'descriptor_only_unless_quintuple',
  };
}

export function selfTest() {
  const before = _requests.size;
  const { request_id } = requestPromotion({ pid: 'ACER-PID-TEST', field: 'live_action', scope: 'chamber:0042', reason: 'selftest' });
  const r1 = approvePromotion(request_id, ['jesse', 'signer-2', 'signer-3', 'signer-4', 'signer-5']);
  const rec = getPromotion(request_id);
  const pro = rec.frames.PRO;
  const pra = rec.frames.PRA;
  const baseOk = r1.status === APPROVED && r1.signer_count === 5
    && pro.startsWith('PRO|') && pra.startsWith('PRA|')
    && (_requests.size === before + 1);

  // Wave-S2-C SECRET-tier ack-gate cases (2026-05-19).
  // Reset live-ack store so this run is hermetic; classifier maps
  // (atlas_mutation, atlas:cp:260) → SECRET, which triggers checkLiveAck.
  _liveAckTestReset();
  // (a) SECRET, no ack recorded → DENIED with LIVE_ACK_MISSING_OR_EXPIRED;
  //     5 signers MUST NOT be enough to flip promote=1 without operator ack.
  const sec_req_missing = requestPromotion({ pid: 'ACER-PID-SEC-1', field: 'atlas_mutation', scope: 'atlas:cp:260', reason: 'secret-no-ack' });
  const r_missing = approvePromotion(sec_req_missing.request_id, ['jesse', 'signer-2', 'signer-3', 'signer-4', 'signer-5']);
  const secretAckMissingOk = r_missing.status === DENIED
    && r_missing.reason === 'LIVE_ACK_MISSING_OR_EXPIRED'
    && r_missing.tier === 'SECRET';

  // (b) SECRET, fresh ack recorded → APPROVED with 5 signers.
  const sec_req_fresh = requestPromotion({ pid: 'ACER-PID-SEC-2', field: 'atlas_mutation', scope: 'atlas:cp:260', reason: 'secret-with-ack' });
  _danRecordLiveAck(sec_req_fresh.request_id, 'OP-ACK-SELFTEST', Date.now());
  const r_fresh = approvePromotion(sec_req_fresh.request_id, ['jesse', 'signer-2', 'signer-3', 'signer-4', 'signer-5']);
  const secretAckFulfilledOk = r_fresh.status === APPROVED
    && r_fresh.signer_count === 5;

  const ok = baseOk && secretAckMissingOk && secretAckFulfilledOk;
  return {
    ok,
    request_id,
    status: r1.status,
    signer_count: r1.signer_count,
    pro_frame: pro,
    pra_frame: pra,
    secret_ack_missing: { status: r_missing.status, reason: r_missing.reason, tier: r_missing.tier },
    secret_ack_fulfilled: { status: r_fresh.status, signer_count: r_fresh.signer_count },
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('promotion-bridge.mjs')) {
  if (process.argv.includes('--selftest')) {
    const r = selfTest();
    process.stdout.write('selfTest ok=' + r.ok + ' status=' + r.status + ' signers=' + r.signer_count + '\n');
    process.exit(r.ok ? 0 : 1);
  }
}
