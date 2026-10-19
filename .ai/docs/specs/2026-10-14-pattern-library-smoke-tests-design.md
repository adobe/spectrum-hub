# Pattern Library smoke tests and contributor testing guide

## Summary

SPDOCS-141 adds a small Playwright smoke suite for representative Pattern
Library pages. The suite verifies full-page composition through stable,
repository-owned block hooks across Chromium, Firefox, and WebKit.

SPDOCS-144 extends the canonical testing documentation so contributors can
choose the correct test runner, create fixtures consistently, and reproduce the
new smoke suite locally or against a deployed environment.

The repository already includes `@playwright/test`, Playwright accessibility
and link-check configurations, browser installation guidance, and a canonical
testing guide at `docs/TESTS.md`. This work adds a separate smoke-test contract
instead of duplicating that infrastructure.

## Goals

- Detect regressions that prevent representative Pattern Library pages from
  composing their expected blocks.
- Run the same smoke contract in Chromium, Firefox, and WebKit.
- Keep local execution self-contained while supporting deployed preview and
  production URLs through `PLAYWRIGHT_BASE_URL`.
- Keep smoke failures, reports, and traces separate from accessibility and
  link-check results.
- Give contributors one canonical guide for Web Test Runner, Playwright, test
  fixtures, coverage, and pull-request validation expectations.

## Non-goals

- Visual regression testing or screenshot baselines.
- Exhaustive coverage of every Pattern Library route.
- Assertions against Spectrum Web Components or React Spectrum internals.
- Replacing block unit tests, accessibility tests, or the full-site link crawl.
- Mobile emulation in the initial smoke suite.
- Sharding before runtime demonstrates a need.

## Test architecture

Add `playwright.smoke.config.js` with `testDir` set to `test/e2e`. The config
defines three desktop projects using Playwright's standard Chromium, Firefox,
and WebKit device settings. Local execution uses port `3003`. Reports are
written to `playwright-report-smoke/`, and run artifacts are written below
`test-results/smoke/`.

The configuration reads `PLAYWRIGHT_BASE_URL`:

- When the variable is unset, Playwright starts `npx aem up` on a dedicated
  local port, proxies public content from the main `.aem.live` origin, and uses
  the local server as the base URL.
- When the variable is set, Playwright does not start a local server and uses
  the supplied deployed URL without fallback.

The suite runs tests in parallel. CI uses one retry and records a trace on the
first retry. Smoke reports and result artifacts use dedicated output paths so
they cannot overwrite accessibility or link-check artifacts.

Add these npm scripts:

- `test:e2e` runs the smoke suite with `playwright.smoke.config.js`.
- `test:e2e:ui` opens Playwright UI mode with the same configuration.

## Initial route contract

Use one data-driven smoke spec with an explicit route and selector table:

| Route | Stable hook |
| --- | --- |
| `/docs/pattern-library/cards` | `.card-content-container` |
| `/docs/pattern-library/table` | `.table table` |
| `/docs/pattern-library/playground` | `.playground-layout` |

Each test:

1. Navigates to the route and waits for `domcontentloaded`.
2. Verifies that the document response exists and has a successful status.
3. Verifies that at least one matching block hook is visible.

The suite does not assert exact copy, Spectrum implementation details,
screenshots, or `networkidle`. This keeps the contract focused on page
availability and full-page block composition.

## Continuous integration

Add a dedicated workflow for pull requests targeting `main`. The job:

1. Checks out the repository.
2. Configures Node.js 20 with the existing npm cache pattern.
3. Runs `npm ci`.
4. Runs `npx playwright install --with-deps chromium firefox webkit`.
5. Runs `npm run test:e2e`.
6. Uploads the dedicated HTML report and `test-results` directory even when
   tests fail.

The workflow uses the local `aem up` default. It does not require a repository
secret or depend on branch-preview availability. Contributors and manual CI
runs can set `PLAYWRIGHT_BASE_URL` to exercise the same tests against a branch
preview or production.

## Contributor documentation

Update the existing documentation rather than creating a second testing guide:

- Add the smoke command and browser installation command to `README.md`.
- Extend `docs/TESTS.md` with:
  - the smoke scripts and their purpose;
  - local-server and deployed-URL behavior;
  - the initial route list;
  - when to use Web Test Runner instead of full-page Playwright;
  - inline DOM fixtures versus shared HTML fixtures;
  - coverage behavior and focused commands;
  - the pull-request template's automated-test and manual accessibility
    expectations;
  - the new workflow in the CI mapping and validation matrix.

The `create-new-block` skill remains unchanged. It should continue directing
block authors to focused unit and accessibility coverage. Full-page smoke
coverage is a separate contract and should be expanded only when a stable,
representative page needs protection.

## Failure behavior

- A missing or unsuccessful navigation response fails the route test and
  reports the HTTP status.
- A page that loads without composing its expected block fails the visible
  locator assertion.
- The deployed target variable must be set inline or exported in the shell.
  The smoke command does not load the repository's `.env` file.
- A configured deployed URL is used as provided. The configuration does not
  silently start localhost when the remote target is unavailable.
- CI uploads the Playwright report and trace-bearing result artifacts on both
  success and failure.

## Validation

Implementation validation includes:

- `npx playwright test --config=playwright.smoke.config.js --list`
- `npm run test:e2e`
- `npm run lint`
- documentation link, path, and command review

The end-to-end command must pass for all three browser projects against the
local `aem up` default. A deployed-URL run should also be exercised when a
stable preview or production URL is available.

## Ticket outcomes

SPDOCS-141 will list the three initial routes and link the implementing pull
request. SPDOCS-144 will point contributors to the updated canonical testing
guide and the reproducible local and deployed smoke commands.
