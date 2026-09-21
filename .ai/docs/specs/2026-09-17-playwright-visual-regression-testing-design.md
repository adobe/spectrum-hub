# Playwright visual regression testing

## Goal

Spectrum Hub uses Playwright visual regression testing (VRT) to catch unintended rendering changes in blocks, shared custom elements, and a small set of representative pages. The initial rollout runs on every pull request but remains non-blocking while the team measures stability and runtime.

The suite uses the Playwright infrastructure and deterministic fixtures that already support accessibility testing. It does not introduce Storybook or an external visual-review service.

## Architecture

VRT is an independent Playwright suite under `test/visual/`. It has its own configuration, npm script, CI workflow, result directory, and HTML report. Keeping it separate from `test/a11y/` prevents screenshot generation and rebaselining from coupling axe, accessibility-tree, and visual assertions.

The suites share only infrastructure that has the same contract for both:

- Starting the local `aem up` server.
- Navigating to fixture routes.
- Installing deterministic route mocks.
- Waiting for a fixture-specific ready selector.

Visual specs reuse the existing HTML fixtures in `test/a11y/fixtures/`. Shared utilities move to a neutral test-support location when both suites need them; accessibility-only utilities, such as violation formatting and the configured `AxeBuilder`, remain in `test/a11y/`.

The visual configuration defines four projects and sets Playwright's `colorScheme` for the light and dark variants:

- Desktop Chrome, light mode.
- Desktop Chrome, dark mode.
- Mobile Chrome, light mode.
- Mobile Chrome, dark mode.

Stable project names form part of each baseline name. The snapshot path template deliberately targets Linux-generated baselines rather than creating separate macOS and Linux baseline sets.

## Fixture coverage

Every existing block fixture and shared `se-*` custom-element fixture receives a visual spec. Each spec runs in all four visual projects.

The assertion captures the smallest stable root that represents the component. It does not capture fixture scaffolding unless that scaffolding affects the component's layout. A visual case defines:

- A stable scenario name.
- The fixture route.
- A selector that indicates initialization is complete.
- The visual root to capture.
- Any deterministic route mocks.
- Optional setup for a meaningful visual state.

The suite freezes animations, transitions, and the caret. Tests wait for the existing ready selector and for fonts and relevant images to settle before capture. Remote content is mocked. Tests mask content only when it is genuinely volatile and cannot be made deterministic.

Interactive states are included when they exercise visually distinct, high-value behavior, such as an open dialog, expanded navigation, validation error, hover treatment, or focus treatment. The initial suite does not generate every possible permutation for every component.

## Page smoke coverage

A small page-level suite complements isolated fixtures. It covers:

- The homepage.
- A representative component-detail page.
- Search.
- Playground.

The implementation selects stable, unauthenticated routes that are available through the local AEM proxy. Each test captures either the full page or a stable primary region, depending on page volatility. Dynamic API responses, timestamps, user data, and other external inputs are mocked or masked narrowly.

Page smoke tests are intentionally limited. Fixture tests remain the primary source of visual coverage because they are faster, more deterministic, and easier to diagnose.

## Comparison policy

Visual assertions use Playwright's `toHaveScreenshot()`. The default policy allows no differing pixels in the pinned Linux and Chromium environment.

A test may use a scenario-specific tolerance only when unavoidable rendering noise remains after the source of nondeterminism has been addressed. The assertion documents why the tolerance is needed. The suite does not define a broad global pixel or ratio allowance.

Normal pull request runs never approve or update baselines. A missing baseline fails the test. A mismatch produces the expected, actual, and diff images and fails the VRT job.

## Baseline ownership

Linux-generated baselines are committed beside the visual specs. They are reviewed as source-controlled test expectations.

A manually dispatched GitHub Actions workflow runs the same Node, Playwright, Chromium, font, viewport, and operating-system environment as pull request VRT. It invokes Playwright with `--update-snapshots` and uploads the generated baseline directories as an artifact. The workflow never commits or pushes.

To approve an intentional visual change, a developer:

1. Dispatches the baseline-update workflow for the change branch.
2. Downloads the generated artifact.
3. Reviews the changed images.
4. Copies the approved baselines into the branch.
5. Commits the baseline changes with the implementation.

Local macOS runs are useful for authoring and debugging, but Linux CI is authoritative for baseline creation and comparison.

## Continuous integration

The `visual.yml` workflow runs on pull requests targeting `main`. It:

1. Checks out the branch.
2. Installs the pinned Node dependencies.
3. Installs Chromium and its system dependencies.
4. Runs the visual suite.
5. Uploads the HTML report and Playwright test results when the job fails or is cancelled.

Visual artifacts retain expected, actual, and diff images for 30 days. The visual suite uses result and report directories that do not conflict with accessibility testing.

The VRT check remains non-required during a stabilization period. Repository owners may make it required after the suite meets the success criteria without changing the architecture.

## Coverage enforcement

After the initial migration, a coverage test inventories every HTML fixture under the supported block and shared custom-element fixture directories and compares that inventory with the fixture routes declared by visual specs. Every fixture, including additional state-specific fixtures for the same component, must be declared by a visual spec. A new fixture cannot land without corresponding visual coverage.

Explicit exemptions are allowed only for fixtures that cannot produce a meaningful visual rendering. Each exemption includes a reason so the list does not become a silent escape hatch. An additional fixture for an already covered component is not exempt merely because the component has another visual spec.

## Rollout

### Phase 1: Infrastructure and pilot

- Add the shared Playwright fixture helpers and visual configuration.
- Add the npm script and separate output directories.
- Pilot structurally different fixtures, including a simple block, a responsive block, a data-driven block, and a shared custom element.
- Establish deterministic capture and baseline-review conventions.

### Phase 2: Fixture coverage

- Add visual specs for every existing block fixture.
- Add visual specs for every shared custom-element fixture.
- Add coverage enforcement.
- Generate and review the initial Linux baselines.

### Phase 3: Page smoke coverage and CI stabilization

- Add the representative page smoke tests.
- Add pull request and manual baseline-update workflows.
- Measure runtime and investigate every flaky or noisy scenario.
- Document authoring, local debugging, baseline updates, and troubleshooting.

### Phase 4: Required-check evaluation

- Review runtime, flake history, false-positive rate, and usefulness of failure artifacts.
- Make the VRT check required only when repository owners agree it is reliable.

## Error handling

Setup failures, missing fixtures, readiness timeouts, missing baselines, and screenshot mismatches fail with their native Playwright errors. Helpers do not catch these errors or convert them into skipped or successful tests.

Mocks fail when an unexpected request contract is required. Tests do not fall back to live remote data after a mock failure.

## Success criteria

- Every supported block and shared custom element has enforced visual coverage.
- Every fixture runs on desktop and mobile in light and dark mode.
- Repeated runs in the pinned Linux environment produce identical results.
- Failures provide expected, actual, and diff images that identify the affected scenario.
- Intentional baseline changes require human review and a source-controlled commit.
- Pull request runtime is acceptable to repository owners.
- The stabilization period records no unresolved recurring flakes before the check becomes required.
