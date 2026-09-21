# Visual regression tests

The Playwright visual regression test (VRT) suite detects unexpected rendering changes in stable fixtures and representative page states. It is separate from the accessibility suite and uses four Chromium projects: desktop and mobile in light and dark color schemes.

## What the suite covers

- Supported HTML fixtures from `test/a11y/fixtures/`, including shared custom elements
- Representative homepage and component-detail page states
- Component roots or focused page regions rather than arbitrary full-page captures
- A coverage check in [`coverage.node.test.js`](./coverage.node.test.js) that requires each supported fixture to have a visual spec or a reasoned exemption

The suite configuration is in [`playwright.visual.config.js`](../../playwright.visual.config.js). It writes test artifacts to `test-results/visual/` and the HTML report to `playwright-report-visual/`. Approved screenshots belong in a `*-snapshots/` directory beside the corresponding spec.

## Running fixture tests locally

Playwright starts the local AEM server. Run the full unit and browser suite:

```bash
npm run test:visual
```

Run one fixture across all four visual projects:

```bash
npx playwright test --config=playwright.visual.config.js test/visual/blocks/card.spec.js
```

A local run without approved baselines will report missing snapshots. Use it to check fixture behavior and inspect provisional output, not to establish baselines.

## Why Linux CI owns baselines

Screenshots vary across operating systems because font rasterization and browser rendering differ. Pull request checks run in a pinned Playwright container on Ubuntu, so approved baselines must come from the same environment.

Local macOS screenshots are not approved baselines. Only the manual Ubuntu baseline workflow produces committable baselines.

## Generating baseline artifacts

Push the branch, then dispatch the manual workflow:

```bash
gh workflow run visual-baselines.yml --ref <branch>
```

Download the `visual-baselines-<commit-sha>` artifact from the completed workflow run. It contains PNG files under `test/visual/**/*-snapshots/`. Copy the reviewed files into the same paths in the branch.

The workflow never commits or pushes. It only generates and uploads an artifact, retained for 30 days.

`workflow_dispatch` can run a workflow only after its workflow file exists on the default branch. For the initial rollout, land the VRT infrastructure without baselines first. Then create a follow-up branch, run the manual workflow from that branch, import the artifact, and submit the baselines for review.

## Reviewing expected, actual, and diff images

Open the HTML report after a failed run:

```bash
npx playwright show-report playwright-report-visual
```

The report links the expected baseline, actual result, and pixel diff. The underlying failure artifacts are in `test-results/visual/`. CI uploads `playwright-report-visual/` and `test-results/visual/` for failed or cancelled runs and retains them for 30 days.

Inspect the images together. Confirm that the expected image represents intentional UI, that the actual image contains no loading or broken state, and that the diff matches the proposed source change. Baseline changes are reviewed as source changes; do not approve a PNG only to make a check pass.

## Adding a fixture or visual state

1. Add or reuse deterministic HTML in `test/a11y/fixtures/`.
2. Add the matching spec under `test/visual/blocks/` or `test/visual/custom-components/`.
3. Use `defineVisualFixture()` with an exact fixture path, a readiness condition, and the narrowest meaningful visual root.
4. Add separate tests for meaningful states that require interaction or different mocked data.
5. Run `npm run test:visual:unit` to confirm fixture coverage.
6. Generate Ubuntu baselines with the manual workflow and review every PNG.

Every new supported HTML fixture must add VRT coverage or a reasoned no-rendering exemption.

## Handling dynamic content

Make a scenario deterministic before capturing it:

- Mock network responses with stable data.
- Wait for the rendered state, fonts, and images rather than using fixed delays.
- Capture a stable component or page region when unrelated content is live or mutable.
- Use a `prepare` function for deterministic interaction or state setup.
- Mask only content that cannot be controlled and is not part of the behavior under review.

Do not update a baseline that contains timestamps, random values, loading indicators, animation frames, or unexpected remote content. Fix the source of nondeterminism first.

## Scenario-specific tolerance policy

Global screenshot tolerances are prohibited. The default remains an exact pixel comparison.

If a deterministic scenario still has a platform-stable rendering difference, add the smallest possible tolerance to that scenario's `screenshotOptions`. First fix all known nondeterminism, then justify the exception inline beside the setting. Do not use a scenario tolerance to hide broad layout, color, typography, or content changes.

## Coverage exemptions

An exemption is allowed only when a fixture cannot produce meaningful visual rendering. Add it to `EXEMPT_FIXTURES` in [`coverage.node.test.js`](./coverage.node.test.js) with a specific reason.

The current exemptions are:

- `schedule.html`: the block fails before producing a deterministic schedule component because of its current fragment return-shape handling.
- `section-metadata.html`: the block applies section configuration and removes its own root, so no visual component remains to capture.

Do not exempt a fixture because it is difficult to stabilize or because its expected rendering changed.

## Stabilization and required-check policy

The pull request workflow compares the committed Ubuntu baselines but remains non-required during stabilization. Treat failures as investigation signals while the team evaluates runtime, flake rate, and artifact usefulness. Making the check required is a separate decision after the suite is stable.

## Troubleshooting

- **No baseline exists:** Follow the initial-rollout sequence above or run the manual Ubuntu workflow for a branch after the workflow exists on `main`.
- **A local macOS comparison fails:** Use local output for diagnosis. Generate any committable baseline in the Ubuntu workflow.
- **The expected image is missing from the report:** Confirm that the PNG is beside its spec in the expected `*-snapshots/` directory and includes the project name.
- **A fixture times out:** Verify its route mocks and `readySelector`. Avoid fixed sleeps.
- **Images or fonts shift between runs:** Use stable image data, wait for the final rendered state, and confirm all external requests are mocked.
- **The coverage unit test fails:** Add a spec using the fixture's exact route, or add a narrowly reasoned no-rendering exemption.
- **CI reports a visual difference:** Download the failed-run artifacts, inspect expected, actual, and diff images, and fix the implementation or regenerate and review an intentional baseline change.
