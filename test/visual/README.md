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

## Running deployed preview tests

The deployed suite captures stable page regions from an explicit preview URL. It does not replace local fixture coverage, start `aem up`, or fall back to production.

List the deployed scenarios:

```bash
VISUAL_BASE_URL=https://<commit-preview-host> npm run test:visual:deployed:list
```

Run the deployed suite:

```bash
VISUAL_BASE_URL=https://<commit-preview-host> npm run test:visual:deployed
```

`VISUAL_BASE_URL` is required and must be an absolute HTTP or HTTPS URL. Use a preview tied to the exact commit under review. Do not use mutable production as the authoritative baseline source.

Deployed specs and screenshots live under `test/visual/deployed/`. Their result directory, report, and `*-deployed-snapshots/` directories are separate from the deterministic local suite. Never compare a deployed baseline with local fixture output.

The deployed configuration runs one worker at a time. Remote AEM previews can rate-limit concurrent page and asset requests, which may return HTTP 429 responses or leave pages partially decorated.

### Pattern-library pages

The deployed suite captures these pattern-library pages in full:

- `/docs/pattern-library/typography`
- `/docs/pattern-library/buttons`
- `/docs/pattern-library/cards`
- `/docs/pattern-library/core-layouts`
- `/docs/pattern-library/playground`
- `/docs/pattern-library/table`
- `/docs/pattern-library/breadcrumbs`
- `/docs/pattern-library/search`
- `/docs/pattern-library/status-table`
- `/docs/pattern-library/usage`

The explicit manifest is in `test/visual/deployed/pattern-library.spec.js`. To add a page, add its route, stable scenario name, and a route-specific readiness selector to the manifest.

Pattern-library tests wait until decorated sections finish loading and the asynchronous header fragment is present. They scroll until page height and image count stabilize, visit each rendered image, return to the top, and wait for stylesheets, custom-element updates, fonts, and same-origin iframe content to settle before capturing the entire page. Zero-size lazy images in hidden content are ignored because they cannot affect the screenshot.

Full-page screenshot stitching changes the site's fixed and sticky navigation state as Playwright scrolls. The suite keeps that page chrome visible but freezes it in a compact, absolute-positioned state during capture. The playground page masks only the RSP action-button and accordion preview iframes. Those two remote previews demonstrated internal rendering changes across identical runs; the surrounding playground, controls, and every other preview remain covered.

Add a mask only after two runs demonstrate that a specific region changes independently of repository code. Keep the selector page-specific and document the reason beside the manifest entry.

## Why pinned Linux owns baselines

Screenshots vary across operating systems because font rasterization and browser rendering differ. Pull request checks run in a pinned Playwright container on Ubuntu, so approved baselines must come from that same environment.

Local macOS screenshots are useful for diagnosis, but they are not approved baselines. Generate committable baselines in the pinned Linux Playwright container, either through the local Docker commands or the manual GitHub Actions workflows.

## Reviewing differences in a browser

Docker must be running. Start Playwright UI mode in the pinned Linux container:

```bash
npm run test:visual:review
```

Open `http://127.0.0.1:9323`, run the affected tests, and inspect the expected, actual, and diff attachments. The expected-image view includes an overlay slider for comparing the images.

Narrow the review with normal Playwright file, title, and project filters:

```bash
npm run test:visual:review -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

Review mode forces `--update-snapshots=none`. It cannot create or replace a baseline. Stop the command with `Ctrl+C` when review is complete.

For a deployed preview, provide the commit-specific URL explicitly:

```bash
VISUAL_BASE_URL=https://<commit-preview-host> \
  npm run test:visual:deployed:review -- \
  pattern-library.spec.js \
  --project=desktop-light
```

The deployed command never falls back to localhost or production.

## Approving an intentional change

Playwright does not provide an approval button in UI mode. After reviewing an intentional change, update only the accepted test and project:

```bash
npm run test:visual:approve -- \
  test/visual/blocks/card.spec.js \
  --project=desktop-light
```

A title filter is also supported:

```bash
npm run test:visual:approve -- \
  --grep='card default' \
  --project=desktop-light
```

Approval requires a test-file or title filter. A project or worker option alone is rejected so the command cannot replace a broad baseline set accidentally. The command also rejects overrides for its Playwright configuration, UI, and snapshot-update options.

Use the separate deployed command for a commit-specific preview:

```bash
VISUAL_BASE_URL=https://<commit-preview-host> \
  npm run test:visual:deployed:approve -- \
  pattern-library.spec.js \
  --grep='pattern-library-buttons' \
  --project=desktop-light
```

After an update, inspect `git status`, the PNG changes, and the related source change. Baseline changes are reviewed as source changes. Do not approve a PNG only to make a check pass.

Rejecting a regression means leaving the baseline unchanged, fixing the implementation or the source of nondeterminism, and rerunning the comparison.

## Generating baseline artifacts

The manual workflows remain available when Docker is unavailable or when the team needs a shared baseline artifact. Push the branch, then dispatch the local-suite workflow:

```bash
gh workflow run visual-baselines.yml --ref <branch>
```

Download the `visual-baselines-<commit-sha>` artifact from the completed workflow run. It contains PNG files under `test/visual/**/*-snapshots/`. Copy the reviewed files into the same paths in the branch.

The workflow uses the same pinned Playwright image as the local Docker commands. It never commits or pushes. It only generates and uploads an artifact, retained for 30 days.

`workflow_dispatch` can run a workflow only after its workflow file exists on the default branch. For the initial rollout, land the VRT infrastructure without baselines first. Then create a follow-up branch, run the manual workflow from that branch, import the artifact, and submit the baselines for review.

## Generating deployed baseline artifacts

After the deployed workflow exists on the default branch, dispatch it with the branch and commit-specific preview URL:

```bash
gh workflow run visual-deployed-baselines.yml \
  --ref <branch> \
  -f preview_url=https://<commit-preview-host>
```

The workflow validates the URL, runs only `test/visual/deployed/`, and uploads an artifact named with the preview host and commit SHA. It never commits or pushes.

During review, confirm that the preview serves the intended commit and that a second workflow run produces identical screenshots. Do not approve deployed baselines containing personalized data, timestamps, experiments, loading states, or independently changing remote content.

## Reviewing CI artifacts

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
6. Generate pinned Linux baselines with a targeted approval command or the manual workflow, then review every changed PNG.

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

- `section-metadata.html`: the block applies section configuration and removes its own root, so no visual component remains to capture.

Do not exempt a fixture because it is difficult to stabilize or because its expected rendering changed.

## Stabilization and required-check policy

The pull request workflow compares the committed Ubuntu baselines but remains non-required during stabilization. Treat failures as investigation signals while the team evaluates runtime, flake rate, and artifact usefulness. Making the check required is a separate decision after the suite is stable.

## Troubleshooting

- **No baseline exists:** Use a targeted approval command or run the manual Ubuntu workflow for a branch after the workflow exists on `main`.
- **Docker is unavailable:** Use local output for diagnosis and the manual Ubuntu workflow for committable baselines.
- **A local macOS comparison fails:** Use local output for diagnosis. Reproduce and update any committable baseline in the pinned Linux container.
- **The expected image is missing from the report:** Confirm that the PNG is beside its spec in the expected `*-snapshots/` directory and includes the project name.
- **A fixture times out:** Verify its route mocks and `readySelector`. Avoid fixed sleeps.
- **Images or fonts shift between runs:** Use stable image data, wait for the final rendered state, and confirm all external requests are mocked.
- **The coverage unit test fails:** Add a spec using the fixture's exact route, or add a narrowly reasoned no-rendering exemption.
- **CI reports a visual difference:** Download the failed-run artifacts, inspect expected, actual, and diff images, and fix the implementation or regenerate and review an intentional baseline change.
