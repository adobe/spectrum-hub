# Removed-status detection

This document defines how Spectrum Hub should detect that a component has disappeared
from an implementation and populate the **Removed** status without false positives.
Automatic detection is not implemented; `build-status-index.js` has no diffing or ledger
logic.

No implementation emits a "removed" record — a removed component simply stops appearing. Detection is therefore a **diff over time**, owned by spectrum-hub. This work is **deferred and not required for the initial launch**; Removed can be set by hand through [status-overrides.json](../status-overrides.json) (the manual override story), and this automatic detection would augment that later.

The aggregate [index builder](../build-status-index.js) emits
[status-index.json](../status-index.json). This design extends that builder and the
unified model in [scripts/utils/status-model.js](../../scripts/utils/status-model.js).

## Current pipeline behavior

The membership signal — the set of components an implementation currently reports — is not the same for both implementations. Detection must account for that.

### React Spectrum (RSP) — automatic membership signal

- [discover-components.js](../rsp/discover-components.js) fetches the published `@react-spectrum/s2` types from unpkg (jsdelivr fallback) and **rewrites `deps/rsp/components.json` wholesale** every run. This allow list is the authoritative RSP membership set. When a component is unpublished upstream, it drops out of this file on the next run.
- **A total fetch failure fails closed.** `fetchFirst` throws, `main().catch` calls `process.exit(1)`, and the workflow exits before staging changes or updating its pull request. No empty `components.json` is proposed.
- **A single component's extraction failure does not fail the run.** [extract-props.js](../rsp/extract-props.js) logs a warning and continues, leaving any previously committed file for that still-rostered component in place.
- **The silent risk is a _partial_ discovery response** — unpkg returning a truncated `?meta` listing (not an error) would write a smaller `components.json` without throwing, which would then read as many simultaneous removals.

### Spectrum Web Components (SWC) — automatic membership signal

- [discover-components.js](../swc/discover-components.js) fetches the **published** `@adobe/spectrum-wc` CEM from the `latest` distribution tag and **rewrites `deps/swc/components.json` wholesale** every run. The extractor records the concrete version that `latest` resolved to in `deps/swc/version.json`. The daily workflow ([extract-swc-properties.yml](../../.github/workflows/extract-swc-properties.yml)) runs this discovery step before extraction. `components.json` is a generated `{ tag: modulePath }` object; a tag drops out when it disappears from the published CEM.
- [extract-cem-components.js](../swc/extract-cem-components.js) iterates the generated allow list and, if a tag is unexpectedly missing from the CEM it fetches, **warns and skips** (`Warning: <tag> not found in CEM`), leaving the existing data file in place. Discovery and extraction read the same published CEM in the same run; this path also supports a manually supplied local CEM.
- **Unlike RSP's discovery script, SWC's has no empty-result guard.** `collectComponents` can return an empty object without throwing, and `discover-components.js` will still write it to `components.json` — there's no floor/abort check comparable to RSP's `fetchFirst` failure path. This is a real gap worth closing before relying on SWC's signal the way the guards below rely on RSP's.

### Shared facts

- **RSP prunes stale extraction files; SWC does not.** RSP's extractor removes files that are no longer in `components.json`, with a roster-size guard to prevent a suspiciously small discovery result from deleting most of the catalog. SWC can still leave an orphaned file behind. Membership must therefore be read from the allow list / index roster, never from a directory listing.
- Both workflows stage their data directories with `git add`, which includes tracked deletions produced by RSP pruning. They commit with fixed messages on bot-owned branches and create or update pull requests. A scheduled run becomes part of the default branch's history only when its pull request is merged.
- `deps/status-index.json` and its builder (`deps/build-status-index.js`) run daily near the end of each workflow. The generated changes are proposed through the extraction pull request. Removal detection belongs in this builder.

## Recommendation

Detection lives in the index builder (`deps/build-status-index.js`) and runs after the per-implementation adapters have produced the current run's rosters, but before the index is written and committed.

### 1. Comparing a current run against prior state (AC1)

Work per **platform + implementation** independently (the index is already shaped `platforms.<platform>.<impl>`), so one implementation's outcome never affects another's.

1. Derive **current membership** for each implementation: the set of component keys the adapter reports this run (present with any real status — `available` / `experimental` / `deprecated`). Read this from the roster the adapter builds, not from the data directory.
2. Derive **baseline membership** from the prior index (see AC2).
3. A component is a **removal candidate** when it is present in the baseline and absent from the current run for that implementation.
4. Removal candidates are only promoted to **Removed** after the guards (AC3) and the confirmation window pass. Presence in the current run always recomputes a real status and clears any prior Removed (AC4).

### 2. Where the baseline lives and how far back (AC2)

**Recommendation: distinguish the last accepted baseline from the last successful
scheduled run. The current workflow preserves the former, not the latter.**

- The index on the default branch is the last **merged and accepted** snapshot. It is a suitable baseline for deciding what changed relative to production.
- Each scheduled workflow recreates its bot branch from the default branch and force-updates the extraction pull request. An unmerged run is therefore not automatically the next run's baseline, and default-branch git history is not a per-run snapshot trail.
- A K-run confirmation window needs state that survives those force-updated runs. Before implementing detection, either retain the prior bot-branch ledger when recreating the branch, preserve run state in another durable store, or change the branch update strategy. Do not equate one commit with one day; failed runs, unmerged pull requests, and manual dispatches all break that assumption.

**Absence ledger.** To carry the confirmation window and the Removed tombstone across
runs, persist a small record—either a top-level field in the index or a sibling
`deps/status-absence-ledger.json`. Per component + implementation it holds
`{ missingSinceRun, consecutiveMisses, removedDate? }`. Keeping it inside the index gives
the accepted state one surface, but the workflow must also recover the prior unmerged
ledger before a scheduled run if `consecutiveMisses` is meant to count runs rather than
merges.

### 3. Guard against a failed or empty run (AC3)

A bad extraction must never mark every component Removed. Layer these guards; the run aborts with a non-zero exit and does not update the extraction pull request whenever a hard guard trips.

1. **Fail closed on empty output.** If an implementation's current membership is empty, treat the run as failed for that implementation: skip diffing, keep the last good data, and exit non-zero so the extraction pull request is not updated. This extends the pattern discovery already uses.
2. **Absolute floor.** Refuse to diff an implementation whose current membership is below a configured floor (e.g. fewer than a handful of components). Below the floor is presumed broken, not a mass removal.
3. **Relative-drop circuit breaker.** If membership shrinks by more than a threshold in a single run — recommend a small absolute count **and** a percentage (e.g. more than 3 components _or_ more than ~10%) — do **not** auto-mark Removed. Genuine removals are one or two components at a time; a broken run drops many at once. A tripped breaker aborts the run and flags for manual review rather than writing removals.
4. **Per-source isolation.** Evaluate guards per implementation. An RSP fetch problem must not zero out SWC, and vice versa.
5. **Confirmation window (debounce).** Require a candidate to be absent for **K consecutive successful extraction runs** (recommend K = 2) before flipping to Removed, tracked via `consecutiveMisses` in the durable ledger described above. This absorbs a single transient miss (CDN hiccup, one-off truncation) that slipped past the other guards. K is configurable so PM can tune sensitivity vs latency.

Guards 1–4 are fail-closed circuit breakers; guard 5 is the debounce that prevents a one-run blip from ever becoming Removed.

### 4. Transition back when a component returns (AC4)

Removed is a **remembered** state: a removed component is absent from extraction, so it has no data row to render. The index **synthesizes** its Removed row from the ledger tombstone (`removedDate` provenance), so the table can show Removed even though nothing is being extracted for it.

- **Reappearance clears Removed automatically.** Detection is recomputed statelessly each run: if the component is present in the current extraction, its real status (`available` / `experimental` / …) is recomputed and the tombstone and `consecutiveMisses` are cleared. Nothing stays stuck Removed. A removed-then-re-added component returns to its live status on the first run it reappears.
- **Retention of the Removed marker** is a product decision. Recommended default: keep showing Removed with its `removedDate` until either the component reappears or the entry is aged out after a configured window (e.g. 90 days), after which it drops from the table. Track need before hard-coding.
- **Manual override precedence.** [status-overrides.json](../status-overrides.json) is applied last and always wins, so a curator can force Removed or clear a false Removed by hand, independent of automatic detection.

### 5. Follow-on implementation story sizing (AC5)

The aggregate index builder runs in both daily extraction workflows, and its output is
proposed through bot-owned pull requests.

Work items:

- Load the last accepted index as the production baseline and recover the previous successful run's ledger; compute per-implementation current membership from adapter rosters.
- Diff membership to produce removal candidates.
- Implement the guards: empty-output fail-closed, absolute floor, relative-drop circuit breaker, per-source isolation, and the K-run confirmation window backed by the absence ledger.
- Persist the ledger (`missingSinceRun`, `consecutiveMisses`, `removedDate`) and synthesize Removed rows from it.
- Clear tombstones on reappearance; apply optional aging.
- Ensure `status-overrides.json` applies last and wins.
- Wire the workflow so a tripped hard guard aborts the step and prevents the extraction pull request from being updated.
- Tests (TDD, per repo convention) — see QA below.

**Estimate: one story, ~M.** The detection logic is a contained state machine plus
guards; most of the effort is the fixtures and edge-case tests. Close SWC's empty-result
guard gap as part of this scope or as a prerequisite.

## Validating the recommendation (QA)

A reviewer can confirm the approach against fixtures fed to the diff, mirroring the acceptance tests:

- **Detects a simulated disappearance.** Baseline roster contains `Foo`; current roster omits `Foo` while remaining membership is healthy (above floor, within the drop threshold). After K runs of absence, `Foo` resolves to Removed with a `removedDate`.
- **Rejects a simulated empty run.** Current roster for an implementation is empty. The run aborts without writing removals or updating the extraction pull request.
- **Rejects a simulated failed or partial run.** Current roster drops below the floor or beyond the drop threshold. The circuit breaker trips, nothing is marked Removed, and the run is flagged for review.
- **Transitions back.** A component marked Removed reappears in the current roster. Its live status is recomputed and the tombstone is cleared.
- **Debounces a transient miss.** A component absent for a single run below K remains a candidate rather than being marked Removed.

## Requirements before implementation

- Harden RSP's `discover-components.js` against a **partial/truncated** `?meta` response (e.g. sanity-check the count against the prior run) so silent under-discovery cannot masquerade as mass removal upstream of the index.
- Give SWC's `discover-components.js` an empty-result guard equivalent to RSP's fail-closed `fetchFirst`/`process.exit(1)` path, so an empty CEM response cannot silently write an empty `components.json`.
- Decide how the extraction workflow will preserve the absence ledger across force-updated, unmerged runs before defining K in terms of scheduled runs.
- Confirm the guard thresholds (floor, relative-drop count/percentage) and the confirmation window K with PM.
- Confirm the Removed retention/aging policy with PM/design.
