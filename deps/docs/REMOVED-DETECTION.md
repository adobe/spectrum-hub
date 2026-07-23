# Removed-status detection (spike)

Spike deliverable for the "Removed" detection story. It recommends how Spectrum Hub should detect that a component has disappeared from an implementation and populate the **Removed** status reliably, without false positives. The detection design below is **not yet implemented** — `build-status-index.js` has no diffing/ledger logic today — this remains a recommendation to build against.

No implementation emits a "removed" record — a removed component simply stops appearing. Detection is therefore a **diff over time**, owned by spectrum-hub. This work is **deferred and not required for the initial launch**; Removed can be set by hand through [status-overrides.json](../status-overrides.json) (the manual override story), and this automatic detection would augment that later.

This spike originally depended on the aggregate index existing first; **the index and its builder now exist** ([build-status-index.js](../build-status-index.js), emitting [status-index.json](../status-index.json)), so that prerequisite is satisfied — the detection story is unblocked, just not yet scheduled. It complements the data-contract spike in [DATA-CONTRACT.md](./DATA-CONTRACT.md) and the unified model in [scripts/utils/status-model.js](../../scripts/utils/status-model.js).

## Pipeline reality this recommendation is built on

The membership signal — the set of components an implementation currently reports — is not the same for both implementations. Detection must account for that.

### React Spectrum (RSP) — has an automatic membership signal

- [discover-components.js](../rsp/discover-components.js) fetches the published `@react-spectrum/s2` types from unpkg (jsdelivr fallback) and **rewrites `deps/rsp/components.json` wholesale** every run. This allow list is the authoritative RSP membership set. When a component is unpublished upstream, it drops out of this file on the next run.
- **A total fetch failure already fails closed.** `fetchFirst` throws, `main().catch` calls `process.exit(1)`, the workflow step fails, and the "Commit changes" step never runs. No empty `components.json` is committed.
- **A single component's fetch failure also fails closed today.** [extract-props.js](../rsp/extract-props.js) throws if any component's `.d.ts` cannot be fetched from any CDN, aborting the whole run.
- **The silent risk is a _partial_ discovery response** — unpkg returning a truncated `?meta` listing (not an error) would write a smaller `components.json` without throwing, which would then read as many simultaneous removals.

### Spectrum Web Components (SWC) — now has an automatic membership signal too

This section's original finding is **out of date**. At spike time, `components.json` was manually maintained and the CEM was unpublished; both have since changed:

- [discover-components.js](../swc/discover-components.js) now exists and fetches the **published** `@adobe/spectrum-wc` CEM (currently pinned to a snapshot tag) to **rewrite `deps/swc/components.json` wholesale** every run — the same pattern as RSP's discovery script, one level up. The daily workflow ([extract-swc-properties.yml](../../.github/workflows/extract-swc-properties.yml)) runs this discovery step before extraction. `components.json` is now a generated `{ tag: modulePath }` object, not a hand-maintained flat array; a tag drops out automatically when it disappears from the published CEM.
- [extract-cem-components.js](../swc/extract-cem-components.js) still iterates the (now auto-generated) allow list and, if a tag is unexpectedly missing from the CEM it fetches, **warns and skips** (`Warning: <tag> not found in CEM`), leaving the previous data file in place. In normal operation this path rarely triggers, since discovery and extraction read the same published CEM in the same run — it mainly guards against a race between the two fetches or a manually-supplied local CEM path.
- **Unlike RSP's discovery script, SWC's has no empty-result guard.** `collectComponents` can return an empty object without throwing, and `discover-components.js` will still write it to `components.json` — there's no floor/abort check comparable to RSP's `fetchFirst` failure path. This is a real gap worth closing before relying on SWC's signal the way the guards below rely on RSP's.
- Consequently, SWC removal detection is no longer blocked on CEM publication or a discovery step — both now exist. It has near-parity with RSP's membership signal, modulo the empty-result guard gap above.

### Shared facts

- **No extractor deletes stale data files, and both workflows only `git add` (never `git rm`).** `deps/rsp/data/` and `deps/swc/data/` accumulate orphaned files. **Membership must be read from the allow list / index roster, never from a directory listing.**
- The daily bots commit with fixed messages (`chore: update React Spectrum component properties and status index` for RSP, `chore: update component properties from CEM and status index` for SWC). **Git history is therefore a free, per-run, auditable snapshot trail.**
- `deps/status-index.json` and its builder (`deps/build-status-index.js`) **now exist** and run daily as the last step of each workflow. This recommendation specifies behavior to build **into** that existing builder, not a builder yet to be created.

## Recommendation

Detection lives in the index builder (`deps/build-status-index.js`) and runs after the per-implementation adapters have produced the current run's rosters, but before the index is written and committed.

### 1. Comparing a current run against prior state (AC1)

Work per **platform + implementation** independently (the index is already shaped `platforms.<platform>.<impl>`), so one implementation's outcome never affects another's.

1. Derive **current membership** for each implementation: the set of component keys the adapter reports this run (present with any real status — `available` / `experimental` / `deprecated`). Read this from the roster the adapter builds, not from the data directory.
2. Derive **baseline membership** from the prior index (see AC2).
3. A component is a **removal candidate** when it is present in the baseline and absent from the current run for that implementation.
4. Removal candidates are only promoted to **Removed** after the guards (AC3) and the confirmation window pass. Presence in the current run always recomputes a real status and clears any prior Removed (AC4).

### 2. Where the baseline lives and how far back (AC2)

**Recommendation: the previously committed `deps/status-index.json` is the baseline. Do not introduce a separate baseline file.**

- The index is git-tracked and committed by the daily action, so the last committed index _is_ the previous run's snapshot. On a checkout it is simply the on-disk `status-index.json` before the builder overwrites it; equivalently `git show HEAD:deps/status-index.json`.
- **Compare against one run back** (one day on the daily cron). A single genuine removal only needs the immediately prior snapshot to be detected.
- **Retention / looking further back** comes from git history for free — any past state is recoverable via `git log -- deps/status-index.json` without extra storage or a bespoke baseline format. The confirmation window (AC3) does not require re-reading history each run because it is carried in a small committed ledger (below), which is simpler and deterministic than resolving "N commits back" across merges.

**Absence ledger.** To carry the confirmation window and the Removed tombstone across runs, persist a small committed record — either a top-level field in the index or a sibling `deps/status-absence-ledger.json`. Per component + implementation it holds `{ missingSinceRun, consecutiveMisses, removedDate? }`. It is git-tracked, auditable, and avoids re-diffing history on every build. Recommended to keep it inside the index so there is a single committed surface.

### 3. Guard against a failed or empty run (AC3)

A bad extraction must never mark every component Removed. Layer these guards; the run aborts (non-zero exit, no commit) whenever a hard guard trips.

1. **Fail closed on empty output.** If an implementation's current membership is empty, treat the run as failed for that implementation: skip diffing, keep the last good data, and exit non-zero so the "Commit changes" step does not run. This extends the pattern discovery already uses.
2. **Absolute floor.** Refuse to diff an implementation whose current membership is below a configured floor (e.g. fewer than a handful of components). Below the floor is presumed broken, not a mass removal.
3. **Relative-drop circuit breaker.** If membership shrinks by more than a threshold in a single run — recommend a small absolute count **and** a percentage (e.g. more than 3 components _or_ more than ~10%) — do **not** auto-mark Removed. Genuine removals are one or two components at a time; a broken run drops many at once. A tripped breaker aborts the run and flags for manual review rather than writing removals.
4. **Per-source isolation.** Evaluate guards per implementation. An RSP fetch problem must not zero out SWC, and vice versa.
5. **Confirmation window (debounce).** Require a candidate to be absent for **K consecutive runs** (recommend K = 2, i.e. two days on the daily cron) before flipping to Removed, tracked via `consecutiveMisses` in the ledger. This absorbs a single transient miss (CDN hiccup, one-off truncation) that slipped past the other guards. K is configurable so PM can tune sensitivity vs latency.

Guards 1–4 are fail-closed circuit breakers; guard 5 is the debounce that prevents a one-run blip from ever becoming Removed.

### 4. Transition back when a component returns (AC4)

Removed is a **remembered** state: a removed component is absent from extraction, so it has no data row to render. The index **synthesizes** its Removed row from the ledger tombstone (`removedDate` provenance), so the table can show Removed even though nothing is being extracted for it.

- **Reappearance clears Removed automatically.** Detection is recomputed statelessly each run: if the component is present in the current extraction, its real status (`available` / `experimental` / …) is recomputed and the tombstone and `consecutiveMisses` are cleared. Nothing stays stuck Removed. A removed-then-re-added component returns to its live status on the first run it reappears.
- **Retention of the Removed marker** is a product decision. Recommended default: keep showing Removed with its `removedDate` until either the component reappears or the entry is aged out after a configured window (e.g. 90 days), after which it drops from the table. Track need before hard-coding.
- **Manual override precedence.** [status-overrides.json](../status-overrides.json) is applied last and always wins, so a curator can force Removed (before automatic detection ships, or for an SWC removal the pipeline can't see) or clear a false Removed by hand, independent of detection.

### 5. Follow-on implementation story sizing (AC5)

**Prerequisite met, not yet scheduled:** the aggregate index and its builder (`deps/build-status-index.js`) now exist and run daily. This story is unblocked — the work below can start whenever it's prioritized.

Work items:

- Load the prior committed index as the baseline; compute per-implementation current membership from adapter rosters.
- Diff membership to produce removal candidates.
- Implement the guards: empty-output fail-closed, absolute floor, relative-drop circuit breaker, per-source isolation, and the K-run confirmation window backed by the absence ledger.
- Persist the ledger (`missingSinceRun`, `consecutiveMisses`, `removedDate`) and synthesize Removed rows from it.
- Clear tombstones on reappearance; apply optional aging.
- Ensure `status-overrides.json` still applies last and wins.
- Wire the workflow so a tripped hard guard aborts the step and prevents commit/push.
- Tests (TDD, per repo convention) — see QA below.

**Estimate: one story, ~M**, now that the index builder exists. The detection logic is a contained state machine plus guards; most of the effort is the fixtures and edge-case tests. SWC's discovery step already exists (see above), so it no longer needs to be split out as separate scope — though closing its empty-result guard gap first would bring it to full parity with RSP's fail-closed behavior.

## Validating the recommendation (QA)

A reviewer can confirm the approach against fixtures fed to the diff, mirroring the acceptance tests:

- **Detects a simulated disappearance.** Baseline roster contains `Foo`; current roster omits `Foo` while remaining membership is healthy (above floor, within the drop threshold). After K runs of absence, `Foo` resolves to Removed with a `removedDate`. → **passes**.
- **Rejects a simulated empty run.** Current roster for an implementation is empty. → run aborts, no removals written, no commit. → **passes**.
- **Rejects a simulated failed / partial run.** Current roster drops below the floor or beyond the drop threshold. → circuit breaker trips, nothing marked Removed, flagged for review. → **passes**.
- **Transitions back.** A component previously Removed reappears in the current roster. → recomputed to its live status, tombstone cleared. → **passes**.
- **Debounces a transient miss.** A component absent for a single run (below K) is **not** marked Removed; it is only a candidate. → **passes**.

## Follow-ups this spike surfaced

- Harden RSP's `discover-components.js` against a **partial/truncated** `?meta` response (e.g. sanity-check the count against the prior run) so silent under-discovery cannot masquerade as mass removal upstream of the index.
- ~~SWC has no automatic membership signal. Decide whether SWC removal detection waits on CEM publication plus a discovery step, or stays manual (override-only) for now~~ — resolved: the CEM is published and SWC's `discover-components.js` now provides the same wholesale-rewrite signal RSP's does.
- New: give SWC's `discover-components.js` an empty-result guard equivalent to RSP's fail-closed `fetchFirst`/`process.exit(1)` path, so an empty CEM response can't silently write an empty `components.json`.
- Confirm the guard thresholds (floor, relative-drop count/percentage) and the confirmation window K with PM.
- Confirm the Removed retention/aging policy with PM/design.
