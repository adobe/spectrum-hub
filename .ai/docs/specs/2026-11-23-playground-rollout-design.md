# Incremental playground rollout

Updated: November 24, 2026. Tracking ticket: SPDOCS-680.

## Source and branch policy

Preserve [#178](https://github.com/adobe/spectrum-hub/pull/178) and the
`refactor-playground` branch as the implementation source. The repaired local
source is commit `26ea9c7821026e54ba611008684b40dc8be70cfa`. The PR last referenced
an older head; verify its live state before PR-dependent work. Do not overwrite
either source while extracting work.

The first rollout branch is based on `main`. The next branch, `pg-runtime`,
is based on `pg-tests` at `8c6b284dece880a1e1f4000bbabd59d4fdbda1db`, as requested.
It includes that baseline and isolates phase 2 in commit `c333739c`.
A separate snippet-state fix is committed as `7df51138` on `pg-runtime` before
phase 3. Publication is not authorized yet. Do not push or open PRs until
requested.

The first branch, `pg-tests`, starts at
`093e3eee9033c0233bd72e59bcb5c40874a473a6`. Source commits combine production
changes and tests, so extract only the relevant test changes rather than apply
the entire refactor commit.

Phases 1 and 2 and the snippet-state fix are locally committed. Phases 3 through
8 are planned, not implemented on these rollout branches. Confirm the next
branch base before continuing; this plan does not choose bases for later slices.

## Release boundaries

| Phase | Scope | Production effect |
| --- | --- | --- |
| 1 | Control-parity tests and rollout contract | None |
| 2 | Runtime manifest generation and compatible package pins | No runtime activation |
| 3 | New preview shell and coordinator at distinct URLs | Published but unused |
| 4 | RSP/AI, SWC, and image adapters | Published but unused |
| 5 | Parent pipeline and SWC/image activation | RSP retains its legacy path |
| 6 | RSP S2/AI activation | S2 always; AI only on exact `patterns` page segments |
| 7 | Sandbox activation and preview-specific policy | Isolate previews after browser, deployment, and interaction gates pass |
| 8 | Cache-gated legacy cleanup | Remove only retired compatibility contracts |

Split an adapter stage further if it is not independently reviewable. Keep the
tests and owning documentation with each implementation change.

RSP AI activation remains planned for phase 6. Introduce it with the new RSP
runtime rather than implement it twice on both renderers. S2 and AI must share
compatible S2 and React versions and the same S2 contexts within a frame.

### Phase 2: additive runtime tooling

Add the runtime-manifest builder, generator, fixed S2/AI source configuration,
generated artifact, and contract tests. The manifest records concrete package
and React versions, export entries, selected stylesheet graphs, and AI's S2
support imports. Keep the source branch's pins when regenerating this slice.

Do not change component discovery, prop extraction, daily workflows, catalogs,
or preview consumers in this phase. Nothing imports the manifest in production.
The existing extraction and legacy previews retain their current version
selection. Wiring extraction to the manifest is a later activation prerequisite,
not part of phase 2. Its owning future slice has not been assigned yet.

Regenerate with `--locked` to retain committed versions. Use `--check` to
verify byte-for-byte reproducibility without writing the artifact. Both modes
read published package files and fail if their graph or required CSS is missing.

### Before phase 3: SWC snippet-state parity

Keep the shared snippet-state helper, its legacy-preview integration, copied
HTML updates, and dependent tests together in a separate fix on `pg-runtime`.
The tests import the helper and assert its script-free output, so they do not
belong on the independently runnable `pg-tests` branch.

Conversation-turn and response-status use the same state updates in the live
preview and before code serialization. Copied HTML represents the selected
state without playground-only scripts. This fix changes the legacy SWC path,
not the inactive runtime manifest or the new shell.

The user confirmed these snippet changes are not live yet. Do not retain inline
script fallbacks for cached previews for this slice. The general compatibility
requirements for the later runtime rollout still apply.

### Phases 3 and 4: sandbox prerequisites without activation

Use the [sandbox implementation plan](../plans/2026-11-24-playground-sandbox.md)
for the detailed tasks. Its task numbers are not rollout phase numbers.

In phase 3, authenticate the new shell's bootstrap before it imports an adapter
or accepts updates. Keep adapter selection local and allow-listed. Prepare the
frame-scoped message channel, one-time initialization, navigation invalidation,
and teardown in the coordinator and shell. Do not postpone these protections
until after the parent activates the new shell in phase 5.

In phase 4, reuse `deps/swc/playground/snippet-state.js` for conversation-turn
and response-status. The adapter owns observer setup and cleanup; do not create
a second implementation of their state updates. Do not activate arbitrary
snippet scripts. Preserve script-free copied HTML for the selected state.

Begin test-only opaque-origin loading probes once the required adapters exist.
These preparations leave the new shell and adapters unused by production
parents and do not enable sandboxing.

### Phase 7: sandbox activation

After phases 5 and 6 activate the new runtime, isolate its previews with
`sandbox="allow-scripts"` without `allow-same-origin`. Use the prepared,
authenticated message channel for initialization, properties, themes, and
explicitly approved actions. Keep controls, code copying, and ordinary site
navigation in the parent.

Before enabling isolation, prove real SWC, RSP S2/AI, and image loading in
Chromium, Firefox, and WebKit. Verify required CORS and preview-specific CSP
through the actual deployment layer. Confirm the intended link, form, download,
and clipboard behavior with the user; those permissions are not approved by
this plan.

Gate activation on denied parent-DOM and site-storage access, preserved allowed
interactions and accessibility, navigation/teardown cleanup, and measured loading
budgets. Record baselines and agree on limits before activation; no numeric
performance threshold or deployment-header configuration has been selected.
Stop if deployment requirements cannot be met. Do not silently add same-origin
permission or an automatic unsandboxed fallback.

Phase 7 does not remove legacy URLs or compatibility contracts. Phase 8 remains
separately gated on cache, open-tab retirement, and an agreed rollback window.
No cache duration or rollback window has been selected.

## Compatibility boundaries

Legacy frames use `preview-ready`, `markup-request`, `markup-response`, and
unidentified property/theme messages. New frames use `shell-ready`,
`preview-init`, and frame-identified messages. Do not connect incompatible parent
and frame versions.

Keep legacy frame URLs, routing fields, and imported exports usable while cached
parents can request them. Publish incompatible modules at distinct URLs. A fresh
routing module must not redirect a cached legacy parent to a new-protocol frame.

Before activation, exercise supported old/fresh parent, routing, helper, and
frame combinations. Before cleanup, confirm browser/CDN freshness and stale
windows, open-tab retirement, and the rollback window. A timer alone does not
prove that running legacy consumers are retired.

## Parity gates

The phase 1 tests exercise the existing parent, real legacy frame documents,
and their production property-application code. Mock external package responses,
not the frame documents or the application's message handlers.

Canaries cover isolated frame updates, boolean values, freeform text, numeric
RSP props, overlay-trigger ownership, SWC attribute removal, native image
variants, and themes. RSP package stand-ins expose the tree passed to
`createRoot().render()`; this checks prop delivery, not real-library styling or
context behavior.

Native variant changes use the controls; native `staticColor` sorting and unset
removal use explicit legacy messages. The legacy picker exposes only "None"
without a catalog, even when the workbook curates colors. This is an existing
control-resolution limitation, not passing UI coverage. Revisit it in stage 5
without folding a production fix into the test-only baseline.

AI rendering is not a passing production-baseline claim in stage 1. Carry its
nested target, parent/sibling composition, PixelLoader, shared-context, and
copied-code expectations into the RSP adapter and activation stages.

Before each activation, inventory the authored playground routes and controls,
verify their expected export/prop owner, run real-package browser checks, and
check accessibility and request budgets. Transport canaries alone do not prove
that every published component renders correctly.
