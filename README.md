# Asolaria — after the 100-billion run: absorption, decomposition, cubes

What happens to the data **farmed from the real free-agent runs (100 billion and under)** once it has
been scored. A garbage collector sits at one end; the cube/PID mint at the other. In between: absorb the
compressed messages → decompose them into cube addresses → mint & seal the cubes → process the
**mistakes and geniuses** into supervisors and PIDs (operator-gated).

```
100B free-agent runs → scored (hookwall/GNN/shannon: genius | mistake)
   │
   ▼  ABSORPTION  (GC end — flow-not-pile)
 GULP 2000  ── "mint or discard happens here"  → SUPER-GULP 50k (25×2000)
   │
   ▼  STORE (sinks)
 cubes (data/cubes/<id>) · white-rooms (3×6×6) · 35 TB GDrive (LEG-4) · omnidirectional-calendar
   │
   ▼  DECOMPOSITION + CUBE MINT
 AoT best-path distilled → ~3.1 kb cube (lossy: noise dropped, signal kept) → cube-builder
   → behcs1024 prism overlay → L5 CUBE-CUBED-SEALER seals (one per H-sector) → lazy PID mint
   │
   ▼  PROCESS into supervisors & PIDs (from mistakes & geniuses) — GATED
 cubes-indexer → tier-classifier (pid_mint = HIDDEN) → promotion-bridge (DEFAULT DENY, quintuple-auth)
   ├─ GENIUS  → promotion request → white-room review → operator T0 → supervisor / PID (PID-Registration-Office)
   └─ MISTAKE → COMPACTED, never deleted (kept as evidence)            [mint end]
```

## 1. Absorption — the GC end
`gc-runtime.mjs`: **gulp every 2000 messages, flow-not-pile** — "the answer is BETTER GC, not LIMITERS"
(file cap 2000, warn 1800). The gulp is the decision point: **"mint or discard happens here."**
`planes/super_gulp.mjs` batches **25 gulps × 2000 = 50k** into a super-gulp. The 100B-and-under stream is
drained continuously, never piled.

## 2. Storage — four sinks
- **cubes** — `data/cubes/<agent_id>/{manifest.json, findings.ndjson}`
- **white rooms** — each surviving pattern → a deterministic **3×6×6 cube address** → `EVT-WHITEROOM-DIGESTED`
- **35 TB Google Drive** — LEG-4 cold sink (`35-TB-google-AI-Ultra-migration`)
- **the calendar** — `omnidirectional-calendar.ndjson` (append-only `register_actor` ledger)

## 3. Decomposition + cube minting
- The **farmed AoT best-path** from the 100B runs is distilled into a **~3.1 kb cube** — *lossy on
  purpose*: noise/hallucination dropped, signal kept and **accumulated** → reasoning improves
  run-over-run (operator-canon).
- `cube-builder.js` mints each cube tagged with `cube[]` + `dim`, appends a `meta.register_actor` entry.
- `behcs1024-prism-overlay-mint.mjs` lays the BEHCS-1024 prism overlay over the cube fleet.
- **L5 `CUBE-CUBED-SEALER`** supervisors (one per H-sector — `…-H01AD`, `…-H06B3`, `…-H0879`, …) **seal**
  the cube into the cube-of-cubes.
- `sup-minting-plane` + `sup-lazy-mint-canon` do the **lazy mint** — a cube gets a PID only when needed.

## 4. Process into supervisors & PIDs — gated
The HOOKWALL back-end trio:
- **`cubes-indexer.mjs`** — indexes genius/mistake into the cubes (`cubes_index` = RESTRICTED tier).
- **`tier-classifier.mjs`** — labels the authority an action needs: `pid_mint`/`spindle_spawn` =
  **HIDDEN**, `describe_only` = PUBLIC, `git_push`/`atlas_mutation` = SECRET; unknown → **SHADOW
  (deny-by-default)**. No auto-promote — it only labels.
- **`promotion-bridge.mjs`** — descriptor→live promotion: **DEFAULT DENY (describe_only); only
  quintuple-auth grants.** Frames `PRO`(requested) → `PRA`(approved/denied), wrapping hookwall +
  white_room review.

**The split:**
- **GENIUS** → promotion *request* → white-room review → **only on operator quintuple-auth (T0)** minted
  as a new **supervisor or PID** (`pid_mint`, HIDDEN) in `D:/PID-Registration-Office` (705/sector; a cube
  without a PID waits there to be minted).
- **MISTAKE** → **compacted, never deleted** — kept as evidence, never promoted.

> The crucial honest point: geniuses **accumulate as cubes freely**, but promotion to a *live*
> supervisor/PID is the **operator-gated step** (default-deny, quintuple-auth = the E≠0 crank). Nothing
> self-promotes.

## 5. Prism/Comb 0-loss — the cube transcode law (2026-07-01)

Everything downstream of the mint is a **bijection**, and entropy is invariant under bijection
(`H(f(X)) = H(X)`): the back end re-relates the farmed signal with **0 loss** — and it **never claims
compression below entropy** (Shannon's bound `E[bits] ≥ H(X)` stands at every stage). One fabric, two
directions: forward = **comb** (collision-avoided absorption — gulp lanes, per-H-sector sealers),
backward = **prism** (many→1 interference-as-search — the scoring that fed this mint).

### The cube transcode — MEASURED (Q-PRISM commit `53023b6`)
The ~3.1 kb minted cube is a **3,200-byte tuple**. Bytes are base-2⁸ digits and BEHCS-1024 glyphs are
base-2¹⁰ digits **of the same integer `N`** — so the `behcs1024-prism-overlay` alphabet change is exact:

- `lcm(8, 10) = 40` bits ⇒ **5 bytes ⇄ 4 symbols**, integer-exact, no padding;
- **3,200 bytes ⇄ 2,560 base-1024 symbols** (640 blocks of 40 bits, remainder 0);
- round-trip `transcode₁₀₂₄→₂₅₆ ∘ transcode₂₅₆→₁₀₂₄ = id` proven **sha256-identical,
  Rust==Python symbol-identical** (Q-PRISM commit `53023b6`); code rate exactly **1.0**.

The alphabet changes; the cube's information does not. A sealed cube can live as bytes, as 1024
symbols, or as both — the prism overlay adds a *view* over the cube fleet, never a loss.

### What is lossy, what is naming — the honest split
- **The ONE discard step is the distillation** (§3): AoT best-path → ~3.1 kb cube, *lossy on
  purpose* — noise/hallucination dropped, signal kept (operator-canon). Loss enters only via
  discard/rounding; this pipeline has exactly that one scored, deliberate discard, and nowhere else.
- **Everything after the mint is 0-loss:** the transcode (bijection), the prism overlay (view),
  L5 sealing (naming into the cube-of-cubes), and **GC compaction = ledger-preserving naming** —
  packets are renamed into cubes/farms; the ledger of digests + farm addresses IS the proof, and the
  absence of a raw answer pile is the design, **not** loss. "MISTAKE → compacted, never deleted"
  (§4) is this same law stated as policy.
- **Referential bound — addressing, NOT compression:** `handle8 = sha256(content)[:8]` is 64 bits
  naming the cube's 25,600 bits — a **coordinate against the content-addressed store**, with
  `H(content | store) = 0`. Collision probability (birthday bound) `≈ M²/2⁶⁵` for M items
  (`M=10⁶ → ≈2.7×10⁻⁸`; full sha256 negligible). A PID is a coordinate, not a counter. Referential
  cubes = infinite **addressing** capacity, not lossless infinite compression — hold this boundary.

### Scope tags
- **MEASURED** — the 256↔1024 rung only: the 3,200-byte ⇄ 2,560-symbol round-trip, sha256-identical
  (Q-PRISM `53023b6`; see also `79e8d63`, `de00aca`).
- **CANON** — the 43+ level ladder as a groupoid (`T_ji ∘ T_ij = id`, `T_jk ∘ T_ij = T_ik` ⇒
  translation is omnidirectional and path-independent); the CRT prime-lane frame behind the
  per-sector comb (`ℤ_M ≅ ℤ_{m₁} × … × ℤ_{m_k}` — separate lanes, exact recombination).
- **UNVERIFIED** — every other rung of the ladder, until it earns MEASURED by its own round-trip
  proof. E=0 throughout: this section describes; nothing here fires, mints, or promotes.

Cross-links: Q-PRISM (proof commits `53023b6` / `79e8d63` / `de00aca`) · waves-cascades (the
comb/prism duality) · what-is-asolaria (the reductions boundary) · N-Nest (the integrity dual:
verification = recomputation = applying the inverse map) · the Metatagging repo (physics grounding
of the expandable Brown-Hilbert cube space).

## Registered back-end fleet (PID-office)
`sub-ROOM-SECTOR-LANE-{GULP,SUPER_GULP,MINTING}` · `sup-gulp-super-gulp` · `sup-minting-plane` ·
`sup-lazy-mint-canon` · `sup-cube_cubed_sealer` + `sup-AGT-L5-SUP-CUBE-CUBED-SEALER-H*` (per-sector) ·
`sup-absorb_5_cubes_systems` · `agent-FARM-ARCHIVE-PID-*` · `agent-*-FREE-AGENT-PID-MINTED` ·
`prof-PROF-VERB-MINT` · `agent-LX-PID-MINT-AGENT`.

---
Part of the chain — this is the tail that runs **inside the fleet** after `Shannon-and-the-gnns-stage`:
emitter → dispatcher → fleet (`Asolaria-hermes-work` / `THE-CHAIN.md`, full map in `MAP.md`).
Status: source/docs only — no keys/seeds/tokens, **no farmed corpus / HBP corpus**, no PID-office bytes,
no private collaborator identifiers, no covert adversary data. Upstream open-source attribution (the
Dan Edens 6-hook bundle, MIT) is retained per license. Gated / E=0 / describe-only — no fire.
Adversarially secret/PII-audited before commit (4-lens + triage).
