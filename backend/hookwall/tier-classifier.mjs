// ============================================================================
// Lineage: derived from Dan Edens' 6-hook bundle (Madness Interactive / madnessinteractive.cc).
// Foundation primitive: pre_tool_guard / session_tracking / transcript_backup / syntax_checker / safety_net / approval_guard.
// This module is the federation-modified descendant; original at C:/Users/acer/Asolaria/tmp/dan-package/asolaria-core/.
// DAN ACCEPTED ceremony 2026-05-19 — quintuple authority cp 263.
// Canon: project_dan_hooks_6_hook_bundle_canon_2026_05_19.md
// ============================================================================
// tier-classifier.mjs — PAN Wave-4 tier classification + halt-invariants ONLY.
// Per AETHER + EREBUS rejection of lone-agent-disguised-as-5: this module
// performs NO auto-promote, NO signer synthesis, NO window logic. Classifier
// returns a tier label; halt-invariants return a hard-stop flag; required
// signer matrix is a pure lookup. Decisions live in caller / promotion-bridge.
// Default unknown → SHADOW (deny-by-default escalation).

const TIERS = Object.freeze({
  PUBLIC: 'PUBLIC',
  RESTRICTED: 'RESTRICTED',
  STEALTH: 'STEALTH',
  HIDDEN: 'HIDDEN',
  SHADOW: 'SHADOW',
  SECRET: 'SECRET',
});

// Field-name → tier. Pure lookup, no synthesis.
const FIELD_TIER = Object.freeze({
  // PUBLIC
  describe_only: TIERS.PUBLIC,
  read_metric: TIERS.PUBLIC,
  emit_log: TIERS.PUBLIC,
  // RESTRICTED
  chamber_load: TIERS.RESTRICTED,
  chamber_eject: TIERS.RESTRICTED,
  cubes_index: TIERS.RESTRICTED,
  // STEALTH
  live_action: TIERS.STEALTH,
  gnn_dispatch: TIERS.STEALTH,
  event_route: TIERS.STEALTH,
  // HIDDEN
  pid_mint: TIERS.HIDDEN,
  spindle_spawn: TIERS.HIDDEN,
  // SHADOW
  cosign_append: TIERS.SHADOW,
  atlas_read: TIERS.SHADOW,
  // SECRET — all routed via halt-invariants below; classifier marks them SECRET
  atlas_mutation: TIERS.SECRET,
  git_push: TIERS.SECRET,
  usb_fresh_gpt: TIERS.SECRET,
  usb_diskpart_clean: TIERS.SECRET,
});

// Scope-substring → tier. First match wins, ordered most-specific-first.
const SCOPE_PATTERNS = Object.freeze([
  { test: (s) => s.startsWith('_big-pickle-quarantine'), tier: TIERS.SECRET },
  { test: (s) => s.includes('atlas-index'), tier: TIERS.SECRET },
  { test: (s) => s.endsWith('.v1.bak'), tier: TIERS.SECRET },
  { test: (s) => s.includes('git push origin main'), tier: TIERS.SECRET },
  { test: (s) => s.includes('diskpart clean'), tier: TIERS.SECRET },
  { test: (s) => s.startsWith('chamber:'), tier: TIERS.RESTRICTED },
  { test: (s) => s.startsWith('cube:'), tier: TIERS.RESTRICTED },
  { test: (s) => s.startsWith('public:'), tier: TIERS.PUBLIC },
]);

export function classifyTier(field, scope) {
  const f = typeof field === 'string' ? field : '';
  const s = typeof scope === 'string' ? scope : '';
  if (isHaltInvariant(f, s)) return TIERS.SECRET;
  for (const pat of SCOPE_PATTERNS) {
    if (pat.test(s)) return pat.tier;
  }
  if (FIELD_TIER[f]) return FIELD_TIER[f];
  return TIERS.SHADOW; // unknown → deny-by-default escalation
}

export function isHaltInvariant(field, scope) {
  const f = typeof field === 'string' ? field : '';
  const s = typeof scope === 'string' ? scope : '';
  if (s.startsWith('_big-pickle-quarantine')) return true;
  if (f === 'atlas_mutation') return true;
  if (s.includes('atlas-index')) return true;
  if (s.endsWith('.v1.bak')) return true;
  if (f === 'git_push') return true;
  if (s.includes('git push origin main')) return true;
  if (f === 'usb_fresh_gpt') return true;
  if (s.includes('diskpart clean')) return true;
  if (f === 'usb_diskpart_clean') return true;
  return false;
}

const SIGNER_MATRIX = Object.freeze({
  PUBLIC:     { min: 1, must_include_operator: false, multi_agent_verifier: false, reviewers: 0, operator_keyboard_live_ack_seconds: 0 },
  RESTRICTED: { min: 2, must_include_operator: true,  multi_agent_verifier: false, reviewers: 0, operator_keyboard_live_ack_seconds: 0 },
  STEALTH:    { min: 3, must_include_operator: true,  multi_agent_verifier: false, reviewers: 0, operator_keyboard_live_ack_seconds: 0 },
  HIDDEN:     { min: 4, must_include_operator: true,  multi_agent_verifier: true,  reviewers: 1, operator_keyboard_live_ack_seconds: 0 },
  SHADOW:     { min: 5, must_include_operator: true,  multi_agent_verifier: true,  reviewers: 3, operator_keyboard_live_ack_seconds: 0 },
  SECRET:     { min: 5, must_include_operator: true,  multi_agent_verifier: true,  reviewers: 3, operator_keyboard_live_ack_seconds: 600 },
});

export function requiredSignersFor(tier) {
  const t = typeof tier === 'string' ? tier : '';
  const row = SIGNER_MATRIX[t];
  if (!row) {
    // unknown tier defaults to SHADOW row (deny-by-default escalation)
    return { ...SIGNER_MATRIX.SHADOW };
  }
  return { ...row };
}

export function tiers() {
  return { ...TIERS };
}

export function selfTest() {
  const results = [];
  let ok = true;

  // Round-trip all 6 tiers via known field/scope.
  const tierProbes = [
    { field: 'describe_only',  scope: 'public:metric',          expect: TIERS.PUBLIC },
    { field: 'chamber_load',   scope: 'chamber:0042',           expect: TIERS.RESTRICTED },
    { field: 'live_action',    scope: 'gnn:dispatch:7',         expect: TIERS.STEALTH },
    { field: 'pid_mint',       scope: 'mint:agent-7',           expect: TIERS.HIDDEN },
    { field: 'cosign_append',  scope: 'chain:row-127',          expect: TIERS.SHADOW },
    { field: 'atlas_mutation', scope: 'atlas:cp:260',           expect: TIERS.SECRET },
  ];
  for (const p of tierProbes) {
    const got = classifyTier(p.field, p.scope);
    const pass = got === p.expect;
    if (!pass) ok = false;
    results.push({ kind: 'tier', field: p.field, scope: p.scope, expect: p.expect, got, pass });
  }

  // Halt-invariants — all 5 distinct triggers + 4 field-level variants.
  const haltProbes = [
    { field: 'noop', scope: '_big-pickle-quarantine/x.pkl',     expect: true,  label: 'quarantine-scope' },
    { field: 'atlas_mutation', scope: 'any',                    expect: true,  label: 'atlas_mutation-field' },
    { field: 'noop', scope: 'data/atlas-index/cp260',           expect: true,  label: 'atlas-index-scope' },
    { field: 'noop', scope: 'backup/file.v1.bak',               expect: true,  label: 'v1.bak-suffix' },
    { field: 'git_push', scope: 'repo',                         expect: true,  label: 'git_push-field' },
    { field: 'noop', scope: 'sh -c git push origin main',       expect: true,  label: 'git-push-scope' },
    { field: 'usb_fresh_gpt', scope: 'disk2',                   expect: true,  label: 'usb_fresh_gpt-field' },
    { field: 'noop', scope: 'diskpart clean disk2',             expect: true,  label: 'diskpart-clean-scope' },
    { field: 'usb_diskpart_clean', scope: 'disk2',              expect: true,  label: 'usb_diskpart_clean-field' },
    { field: 'describe_only', scope: 'public:metric',           expect: false, label: 'safe-public' },
  ];
  for (const p of haltProbes) {
    const got = isHaltInvariant(p.field, p.scope);
    const pass = got === p.expect;
    if (!pass) ok = false;
    results.push({ kind: 'halt', label: p.label, field: p.field, scope: p.scope, expect: p.expect, got, pass });
  }

  // Unknown field/scope → SHADOW (default escalation).
  const unkGot = classifyTier('totally_unknown', 'random:scope');
  const unkPass = unkGot === TIERS.SHADOW;
  if (!unkPass) ok = false;
  results.push({ kind: 'default', expect: TIERS.SHADOW, got: unkGot, pass: unkPass });

  // requiredSignersFor sanity for all 6 tiers.
  const matrixProbes = [
    { tier: TIERS.PUBLIC,     min: 1, op: false, mav: false, ack: 0 },
    { tier: TIERS.RESTRICTED, min: 2, op: true,  mav: false, ack: 0 },
    { tier: TIERS.STEALTH,    min: 3, op: true,  mav: false, ack: 0 },
    { tier: TIERS.HIDDEN,     min: 4, op: true,  mav: true,  ack: 0 },
    { tier: TIERS.SHADOW,     min: 5, op: true,  mav: true,  ack: 0 },
    { tier: TIERS.SECRET,     min: 5, op: true,  mav: true,  ack: 600 },
  ];
  for (const p of matrixProbes) {
    const row = requiredSignersFor(p.tier);
    const pass = row.min === p.min
      && row.must_include_operator === p.op
      && row.multi_agent_verifier === p.mav
      && row.operator_keyboard_live_ack_seconds === p.ack;
    if (!pass) ok = false;
    results.push({ kind: 'matrix', tier: p.tier, expect: p, got: row, pass });
  }

  return { ok, count: results.length, results };
}

if (process.argv[1]?.endsWith('tier-classifier.mjs')) {
  if (process.argv.includes('--selftest')) {
    const r = selfTest();
    const fails = r.results.filter((x) => !x.pass);
    process.stdout.write('selfTest ok=' + r.ok + ' count=' + r.count + ' fails=' + fails.length + '\n');
    if (fails.length) process.stdout.write(JSON.stringify(fails, null, 2) + '\n');
    process.exit(r.ok ? 0 : 1);
  }
}
