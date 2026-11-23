# Incremental playground rollout

Tracking ticket: SPDOCS-680.

## Source and branch policy

Preserve [#178](https://github.com/adobe/spectrum-hub/pull/178) and the
`refactor-playground` branch as the implementation source. The repaired local
source is commit `26ea9c7821026e54ba611008684b40dc8be70cfa`; the draft PR still
references its older head. Do not overwrite either source while extracting work.

The first rollout branch is based on `main`. The next branch, `pg-runtime`,
is based on `pg-tests` at `5858e6f6d885f66b64f4ab7d0e8f98f00a99ab70`, as requested.
It includes that baseline and isolates phase 2 in its own diff. Publication is
not authorized yet. Do not push or open PRs until requested.

The first branch, `pg-tests`, starts at
`7b00f7b73398feea1bade1656626eade6a0d9abb`. Source commits combine production
changes and tests, so extract only the relevant test changes rather than apply
the entire refactor commit.

## Release boundaries

| Stage | Scope | Production effect |
| --- | --- | --- |
| 1 | Control-parity tests and rollout contract | None |
| 2 | Runtime manifest generation and compatible package pins | No runtime activation |
| 3 | New preview shell and coordinator at distinct URLs | Published but unused |
| 4 | RSP/AI, SWC, and image adapters | Published but unused |
| 5 | Parent pipeline and SWC/image activation | RSP retains its legacy path |
| 6 | RSP S2/AI activation | S2 always; AI only on exact `patterns` page segments |
| 7 | Cache-gated legacy cleanup | Remove only retired compatibility contracts |

Split an adapter stage further if it is not independently reviewable. Keep the
tests and owning documentation with each implementation change.

AI previews currently exist only on a development branch. Introduce AI with the
RSP activation rather than implement it twice on both renderers. S2 and AI must
share compatible S2 and React versions and the same S2 contexts within a frame.

### Phase 2: additive runtime tooling

Add the runtime-manifest builder, generator, fixed S2/AI source configuration,
generated artifact, and contract tests. The manifest records concrete package
and React versions, export entries, selected stylesheet graphs, and AI's S2
support imports. Keep the source branch's pins when regenerating this slice.

Do not change component discovery, prop extraction, daily workflows, catalogs,
or preview consumers in this phase. Nothing imports the manifest in production.
The existing extraction and legacy previews retain their current version
selection. Wiring extraction to the manifest is a later activation prerequisite,
not part of this additive branch.

Regenerate with `--locked` to retain committed versions. Use `--check` to
verify byte-for-byte reproducibility without writing the artifact. Both modes
read published package files and fail if their graph or required CSS is missing.

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

The first PR exercises the existing parent, real legacy frame documents, and
their production property-application code. Mock external package responses,
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
