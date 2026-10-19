# Pattern Library page contract tests and contributor testing guide

## Summary

SPDOCS-141 adds a small Playwright page contract suite for representative
Pattern Library pages. The suite verifies full-page composition through stable,
repository-owned block hooks across Chromium, Firefox, and WebKit.

SPDOCS-144 extends the canonical testing documentation so contributors can
choose the correct test runner, create fixtures consistently, and reproduce the
new page contract suite locally or against a deployed environment.

The repository already includes `@playwright/test`, Playwright accessibility
and link-check configurations, browser installation guidance, and a canonical
testing guide at `docs/TESTS.md`. This work adds a separate page contract suite
instead of duplicating that infrastructure.

## Naming

Human and agent guidance calls these tests **Pattern Library page contract
tests**. The existing technical interfaces remain unchanged for compatibility:

- npm scripts: `test:e2e` and `test:e2e:ui`
- configuration: `playwright.smoke.config.js`
- test directory: `test/e2e/`
- workflow path: `.github/workflows/e2e.yml`
- report and result paths containing `smoke`

Do not introduce parallel `test:contract` commands or rename these files as
part of the terminology update.

## Goals

- Detect regressions that prevent representative Pattern Library pages from
  composing their expected blocks.
- Run the same page contract in Chromium, Firefox, and WebKit.
- Keep local execution self-contained while supporting deployed preview and
  production URLs through `PLAYWRIGHT_BASE_URL`.
- Keep page contract failures, reports, and traces separate from accessibility and
  link-check results.
- Give contributors one canonical guide for Web Test Runner, Playwright, test
  fixtures, coverage, and pull-request validation expectations.

## Non-goals

- Visual regression testing or screenshot baselines.
- Exhaustive coverage of every Pattern Library route.
- Assertions against Spectrum Web Components or React Spectrum internals.
- Replacing block unit tests, accessibility tests, or the full-site link crawl.
- Mobile emulation in the initial page contract suite.
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
first retry. Page contract reports and result artifacts use dedicated output paths so
they cannot overwrite accessibility or link-check artifacts.

### macOS 27 Firefox workaround

Playwright Firefox versions before 158 cannot launch reliably on macOS 27 when
the real Firefox app-data directory is protected by macOS privacy controls.
Firefox resolves `~/Library/Application Support/Firefox` even when Playwright
supplies a temporary profile, then exits with `Could not find profile folder`.

On Darwin 27 or newer, the page contract configuration creates a stable,
repository-specific directory under the operating system's temporary directory
and passes it to the Firefox project as `CFFIXED_USER_HOME`. This gives the
bundled Firefox an accessible app-data location without changing Chromium,
WebKit, earlier macOS versions, or Linux CI. The configuration preserves an
explicitly set `CFFIXED_USER_HOME`.

The workaround directory is retained between runs because Firefox adds macOS
access-control entries that make per-run cleanup unreliable. It contains only
the bundled test browser's app-data bookkeeping and remains outside the
repository.

The workaround is tracked by:

- [Playwright issue 42768](https://github.com/microsoft/playwright/issues/42768)
- [Mozilla bug 2060476](https://bugzilla.mozilla.org/show_bug.cgi?id=2060476)
- [Playwright Firefox roll 43494](https://github.com/microsoft/playwright/pull/43494)

Remove the workaround after upgrading to a Playwright release that bundles
Firefox 158 or newer. Before removal, run the Firefox project on macOS 27
without `CFFIXED_USER_HOME` and confirm that the browser launches and all
Firefox page contract tests pass.

Add these npm scripts:

- `test:e2e` runs the page contract suite with `playwright.smoke.config.js`.
- `test:e2e:ui` opens Playwright UI mode with the same configuration.

## Initial route contract

Use one data-driven page contract spec with an explicit route and selector table:

| Route | Stable hook |
| --- | --- |
| `/docs/pattern-library/buttons` | `.se-button .btn.primary` |
| `/docs/pattern-library/cards` | `.card-content-container` |
| `/docs/pattern-library/core-layouts` | `.columns .col` |
| `/docs/pattern-library/playground` | `.playground-layout` |
| `/docs/pattern-library/search` | `sh-search` |
| `/docs/pattern-library/status-table` | `.status-table table` |
| `/docs/pattern-library/table` | `.table table` |
| `/docs/pattern-library/typography` | `h6#heading-6.heading-size-xxl` |
| `/docs/pattern-library/usage` | `.usage .usage-panel` |

Each test:

1. Navigates to the route and waits for `domcontentloaded`.
2. Verifies that the document response exists and has a successful status.
3. Verifies that at least one matching route contract is visible.

Most route contracts prove that block decoration completed. Typography is the
deliberate exception: its combined element, ID, and modifier-class selector
verifies that the authored `size-xxl` marker becomes the visual
`heading-size-xxl` class while the generated ID is normalized from
`heading-6-size-xxl` to `heading-6`.

The suite does not assert exact copy, Spectrum implementation details,
screenshots, or `networkidle`. This keeps the contract focused on page
availability, full-page block composition, and the explicit typography
normalization contract.

## Continuous integration

Add a dedicated workflow for pull requests targeting `main`. The job:

1. Checks out the repository.
2. Configures Node.js 20 with the existing npm cache pattern.
3. Runs `npm ci`.
4. Runs `npx playwright install --with-deps chromium firefox webkit`.
5. Runs `npm run test:e2e`.
6. Uploads the dedicated HTML report and `test-results` directory even when
   tests fail.

The workflow and step display labels use “Pattern Library page contract tests.”
The workflow path remains `.github/workflows/e2e.yml`.

The workflow uses the local `aem up` default. It does not require a repository
secret or depend on branch-preview availability. Contributors and manual CI
runs can set `PLAYWRIGHT_BASE_URL` to exercise the same tests against a branch
preview or production.

## Contributor documentation

Update the existing documentation rather than creating a second testing guide:

- Add the page contract command and browser installation command to `README.md`.
- Extend `docs/TESTS.md` with:
  - the page contract scripts and their purpose;
  - local-server and deployed-URL behavior;
  - the initial route list;
  - when to use Web Test Runner instead of full-page Playwright;
  - inline DOM fixtures versus shared HTML fixtures;
  - coverage behavior and focused commands;
  - a direct link to [the pull-request template](../../../.github/PULL_REQUEST_TEMPLATE.md)
    and its automated-test and manual accessibility expectations;
  - the new workflow in the CI mapping and validation matrix.

Update `create-new-block` and `contributor-onboarding` so agents treat page
contract coverage as conditional rather than automatic. Agents should add or
update `test/e2e/pattern-library.spec.js` only when a block has a representative
Pattern Library route and the change alters its full-page composition contract.
Selectors must be repository-owned post-decoration hooks. Unit and
accessibility coverage remain mandatory for new blocks regardless of page
contract coverage.

## Failure behavior

- A missing or unsuccessful navigation response fails the route test and
  reports the HTTP status.
- A page that loads without composing its expected block fails the visible
  locator assertion.
- The deployed target variable must be set inline or exported in the shell.
  The page contract command does not load the repository's `.env` file.
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

SPDOCS-141 will list the initial routes and link the implementing pull request.
SPDOCS-144 will point contributors to the updated canonical testing guide and
the reproducible local and deployed page contract commands.
