# Pattern Library Smoke/Page Contract Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-browser Playwright page contract coverage for representative Pattern Library routes and document how humans and agents run and extend the repository's test suites.

**Architecture:** A dedicated Playwright configuration owns full-page contract execution, local `aem up` startup, deployed URL overrides, browser projects, and isolated artifacts. One data-driven spec defines the route-to-selector contract. A separate pull-request workflow installs all three browsers and preserves reports and retry traces, while `docs/TESTS.md` remains the canonical human guide and repository skills provide matching agent guidance.

**Tech Stack:** Node.js 20, npm, `@playwright/test`, Adobe AEM CLI, GitHub Actions, GitHub-Flavored Markdown.

**Approved TDD exception:** The user approved command-based validation instead of test-first automation for configuration files, package scripts, workflows, and documentation. The page contract spec is itself executable test coverage for existing page behavior. No production application code is added.

**Commit policy:** Do not create commits during implementation. The user explicitly asked to keep task changes uncommitted.

---

## File map

| Path | Responsibility |
| --- | --- |
| `playwright.smoke.config.js` | Configure the page contract browser projects, base URL selection, local server, retries, traces, reports, and result output. |
| `test/e2e/pattern-library.spec.js` | Define the route contracts and assert successful navigation plus visible repository-owned hooks. |
| `package.json` | Expose the stable `test:e2e` and UI-mode commands. |
| `.gitignore` | Ignore the dedicated page contract HTML report at its compatibility path. |
| `eslint.config.js` | Allow the root page contract configuration to import the existing Playwright dev dependency. |
| `.github/workflows/e2e.yml` | Run the three-browser page contract suite on pull requests targeting `main` and upload artifacts. |
| `README.md` | Add the shortest contributor entry point for installing browsers and running page contract tests. |
| `docs/TESTS.md` | Document runner selection, fixture conventions, page contracts, environment behavior, CI mapping, and pull-request expectations. |
| `.ai/skills/create-new-block/SKILL.md` | Tell agents when a new or changed block needs a Pattern Library page contract. |
| `.ai/skills/contributor-onboarding/SKILL.md` | Route contributors and agents to conditional page contract coverage. |
| `.ai/docs/specs/2026-10-14-pattern-library-smoke-tests-design.md` | Preserve the approved design and scope decisions. |
| `.ai/docs/plans/2026-10-14-pattern-library-smoke-tests.md` | Preserve the executable implementation steps and terminology boundary. |

### Task 1: Add the dedicated page contract suite

**Files:**
- Create: `playwright.smoke.config.js`
- Create: `test/e2e/pattern-library.spec.js`
- Modify: `package.json:5-21`
- Modify: `.gitignore:16-19`
- Modify: `eslint.config.js:82-89`

- [ ] **Step 1: Create the route contract spec**

Create `test/e2e/pattern-library.spec.js`:

```js
import { test, expect } from '@playwright/test';

const routes = [
  {
    name: 'buttons',
    path: '/docs/pattern-library/buttons',
    selector: '.se-button .btn.primary',
  },
  {
    name: 'cards',
    path: '/docs/pattern-library/cards',
    selector: '.card-content-container',
  },
  {
    name: 'core-layouts',
    path: '/docs/pattern-library/core-layouts',
    selector: '.columns .col',
  },
  {
    name: 'playground',
    path: '/docs/pattern-library/playground',
    selector: '.playground-layout',
  },
  {
    name: 'search',
    path: '/docs/pattern-library/search',
    selector: 'sh-search',
  },
  {
    name: 'status-table',
    path: '/docs/pattern-library/status-table',
    selector: '.status-table table',
  },
  {
    name: 'table',
    path: '/docs/pattern-library/table',
    selector: '.table table',
  },
  {
    name: 'typography',
    path: '/docs/pattern-library/typography',
    selector: 'h6#heading-6.heading-size-xxl',
    expectation: 'normalizes its sized heading ID',
  },
  {
    name: 'usage',
    path: '/docs/pattern-library/usage',
    selector: '.usage .usage-panel',
  },
];

for (const route of routes) {
  test(`${route.name} pattern ${route.expectation ?? 'composes its block'}`, async ({ page }) => {
    const response = await page.goto(route.path, {
      waitUntil: 'domcontentloaded',
    });

    expect(response, `${route.path} should return a document response`).not.toBeNull();
    expect(
      response.ok(),
      `${route.path} returned ${response.status()} ${response.statusText()}`,
    ).toBe(true);
    await expect(page.locator(route.selector).first()).toBeVisible();
  });
}
```

Keep the table local to this spec. Do not introduce a shared route registry until another suite needs it.

- [ ] **Step 2: Confirm the smoke configuration is not present**

Run:

```bash
npx playwright test --config=playwright.smoke.config.js --list
```

Expected: FAIL because `playwright.smoke.config.js` does not exist. This records the approved configuration-file exception boundary before adding the runner configuration.

- [ ] **Step 3: Add the smoke Playwright configuration**

Create `playwright.smoke.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

const deployedURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report-smoke', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report-smoke', open: 'never' }]],
  outputDir: 'test-results/smoke',
  webServer: deployedURL ? undefined : {
    command: 'npx aem up --url https://main--spectrum-hub--adobe.aem.live --port 3003 --no-open',
    port: 3003,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: deployedURL || 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

Do not add mobile projects, screenshots, or `networkidle`.

- [ ] **Step 4: Add npm scripts**

Add these scripts beside the other Playwright commands in `package.json`:

```json
"test:e2e": "playwright test --config=playwright.smoke.config.js",
"test:e2e:ui": "playwright test --config=playwright.smoke.config.js --ui",
```

No dependency change is required because `@playwright/test` is already a root dev dependency.

- [ ] **Step 5: Ignore the dedicated HTML report**

Add this entry beside the existing Playwright report paths in `.gitignore`:

```gitignore
playwright-report-smoke/
```

`test-results/` already ignores `test-results/smoke/`.

- [ ] **Step 6: Add the smoke config to the test-tooling lint allowlist**

Add `playwright.smoke.config.js` to the existing root-level Playwright config
file list in `eslint.config.js`. Keep `@playwright/test` in `devDependencies`.

- [ ] **Step 7: Verify test discovery**

Run:

```bash
npx playwright test --config=playwright.smoke.config.js --list
```

Expected: PASS and list 27 tests, consisting of 9 routes across 3 browser projects.

- [ ] **Step 8: Install the local browser binaries**

Run:

```bash
npx playwright install chromium firefox webkit
```

Expected: PASS with all three browser binaries available. Do not edit the dependency manifest if this command only downloads browsers.

- [ ] **Step 9: Run the local page contract suite**

Run:

```bash
npm run test:e2e
```

Expected: PASS with 27 tests. Playwright starts `aem up` on port 3003 and each route exposes its expected visible hook.

- [ ] **Step 10: Verify the deployed URL override**

Run:

```bash
PLAYWRIGHT_BASE_URL=https://main--spectrum-hub--adobe.aem.live npm run test:e2e
```

Expected: PASS with 27 tests and no local `aem up` startup message.

- [ ] **Step 11: Inspect the uncommitted task diff**

Run:

```bash
git diff -- .gitignore eslint.config.js package.json playwright.smoke.config.js test/e2e/pattern-library.spec.js
git status --short
```

Expected: only the intended page contract suite, script, ignore, and existing
design-document changes are present. Do not commit.

### Task 2: Add pull-request CI

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Create the dedicated workflow**

Create `.github/workflows/e2e.yml`:

```yaml
name: Pattern Library page contract tests

on:
  pull_request:
    branches: [main]

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Check out code
        uses: actions/checkout@v6

      - name: Use Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium firefox webkit

      - name: Run Pattern Library page contract tests
        run: npm run test:e2e

      - name: Upload Playwright artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-smoke-results
          path: |
            playwright-report-smoke/
            test-results/smoke/
          retention-days: 30
```

Keep the workflow local-server based. Do not add secrets, production defaults, schedules, manual dispatch, matrices, or sharding.

- [ ] **Step 2: Check workflow consistency against existing CI**

Run:

```bash
git diff --check
git diff -- .github/workflows/e2e.yml .github/workflows/a11y.yml .github/workflows/test.yml
```

Expected: `git diff --check` passes. The new workflow follows the repository's checkout, Node 20, npm cache, `npm ci`, Playwright installation, concurrency, and artifact-retention patterns.

- [ ] **Step 3: Inspect the uncommitted task diff**

Run:

```bash
git status --short
```

Expected: `.github/workflows/e2e.yml` is added and no unrelated workflow is modified. Do not commit.

### Task 3: Update contributor testing documentation

**Files:**
- Modify: `README.md:96-121`
- Modify: `docs/TESTS.md:1-205`

- [ ] **Step 1: Add the README entry point**

After the accessibility command in `README.md`, add:

```markdown
To run the Pattern Library page contract tests in Chromium, Firefox, and WebKit:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

The page contract command starts a local `aem up` server. Set
`PLAYWRIGHT_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.live` to test a
deployed environment instead. See [`docs/TESTS.md`](./docs/TESTS.md) for the
route list, fixture conventions, and guidance on choosing a test suite.
```

Preserve the existing accessibility instructions.

- [ ] **Step 2: Expand Playwright setup in the canonical guide**

In `docs/TESTS.md`, update setup guidance to distinguish browser needs:

```markdown
Install Chromium for accessibility and link-check tests:

```bash
npx playwright install chromium
```

Install all three browsers before running the Pattern Library page contract
suite:

```bash
npx playwright install chromium firefox webkit
```

CI adds `--with-deps` because Linux runners also need browser system packages.
```

- [ ] **Step 3: Add page contract commands to the command matrix**

Add:

```markdown
| `npm run test:e2e` | Pattern Library page contract tests in Chromium, Firefox, and WebKit | Full-page composition and stable route hooks |
| `npm run test:e2e:ui` | The page contract suite in Playwright UI mode | Local contract-test authoring and debugging |
| `PLAYWRIGHT_BASE_URL=<url> npm run test:e2e` | The same page contract suite against a deployed site | Branch preview or production validation |
```

Update the paragraph below the table so it also states that `npm test` does not
run page contract tests.

- [ ] **Step 4: Clarify Web Test Runner fixture conventions**

Expand the browser-unit-test section with this repository-specific guidance:

```markdown
Use inline DOM setup in `*.test.js` for focused block and helper behavior. Keep
the markup near the assertion, reset `document.body`, stubs, storage, and
imported state between cases, and extract a local helper when several cases
share the same authored shape.

The repository does not currently use a generic `test/fixtures/*.html`
directory for Web Test Runner. Use a standalone HTML fixture only when the
behavior requires a real page load or the full decoration pipeline. Playwright
accessibility fixtures belong in `test/a11y/fixtures/` and must follow
[`test/a11y/README.md`](../test/a11y/README.md). Do not move small unit-test
markup into a shared HTML file only to reduce line count.
```

This corrects the ticket's generic fixture example to match the repository's actual conventions.

- [ ] **Step 5: Add a Pattern Library page contract section**

Place it after accessibility tests and before link checks:

```markdown
## Pattern Library page contract tests

`test/e2e/` uses Playwright to verify that representative Pattern Library pages
load and compose stable repository-owned block hooks. The initial routes are:

| Route | Expected hook |
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

The typography selector intentionally verifies the authored size-marker
transformation rather than block decoration. It fails if the sized H6 keeps
`size-xxl` in its generated ID instead of normalizing to `heading-6`.

Run the local suite:

```bash
npm run test:e2e
```

The smoke configuration starts `aem up` on port 3003. To run the same contract
against a deployed environment:

```bash
PLAYWRIGHT_BASE_URL=https://<branch>--spectrum-hub--adobe.aem.live npm run test:e2e
```

Set `PLAYWRIGHT_BASE_URL` inline as shown or export it in your shell. The test
command does not load the repository's `.env` file.

Use Web Test Runner for focused JavaScript behavior that can be expressed with
an isolated DOM. Use the page contract suite when a regression would appear only after
a complete page loads and decorates its blocks. Keep smoke assertions on
repository-owned classes or data attributes. Do not assert exact copy,
screenshots, or Spectrum implementation internals.
```

- [ ] **Step 6: Document coverage and pull-request expectations**

Add a concise section or paragraph that states:

```markdown
Web Test Runner collects coverage during `test:unit`, `test:file`, and watch
runs because those scripts pass `--coverage`. Pattern Library page contract
tests protect page composition and do not produce JavaScript coverage.

Before opening a pull request, use the repository template to record which
automated suites ran and how affected pages were browser tested. Automated
tests do not replace the template's manual keyboard and screen-reader checks
when a change affects interaction, semantics, or accessibility.
```

- [ ] **Step 7: Update CI and validation tables**

Add `.github/workflows/e2e.yml` to the CI mapping:

```markdown
| `.github/workflows/e2e.yml` | Pull requests to `main` | Chromium, Firefox, and WebKit Pattern Library page contract tests |
```

Add an end-to-end row to the validation matrix:

```markdown
| Full-page composition or stable page hooks | `npm run test:e2e` |
```

- [ ] **Step 8: Review documentation paths and commands**

Run:

```bash
grep -n "test:e2e\\|PLAYWRIGHT_BASE_URL\\|test/a11y/fixtures\\|e2e.yml" README.md docs/TESTS.md
git diff --check
```

Expected: every command, variable, fixture path, and workflow path appears where intended, and whitespace validation passes.

- [ ] **Step 9: Inspect the uncommitted documentation diff**

Run:

```bash
git diff -- README.md docs/TESTS.md
git status --short
```

Expected: documentation matches the implemented commands and no unrelated contributor guidance changes. Do not commit.

### Task 4: Work around the macOS 27 Firefox launch regression

**Files:**
- Modify: `playwright.smoke.config.js`
- Modify: `docs/TESTS.md`
- Modify: `.ai/docs/specs/2026-10-14-pattern-library-smoke-tests-design.md`

- [ ] **Step 1: Verify the Firefox project fails before the workaround**

Run:

```bash
npm run test:e2e -- --project=firefox --workers=1
```

Expected on macOS 27 with Playwright Firefox before 158: FAIL before navigation
with `Could not find profile folder` or a browser-launch timeout. This is the
regression test. The same command is expected to pass on unaffected platforms.

- [ ] **Step 2: Add the scoped Firefox launch environment**

Update `playwright.smoke.config.js`:

```js
import { mkdirSync } from 'node:fs';
import { release, tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
const darwinMajor = Number.parseInt(release().split('.')[0], 10);
const needsFirefoxHome = process.platform === 'darwin' && darwinMajor >= 27;
let firefoxLaunchOptions;

if (needsFirefoxHome) {
  const firefoxHome = process.env.CFFIXED_USER_HOME
    || join(tmpdir(), 'spectrum-hub-playwright-firefox');
  mkdirSync(firefoxHome, { recursive: true });
  firefoxLaunchOptions = {
    env: {
      ...process.env,
      CFFIXED_USER_HOME: firefoxHome,
    },
  };
}
```

Apply the launch options only to the Firefox project:

```js
{
  name: 'firefox',
  use: {
    ...devices['Desktop Firefox'],
    launchOptions: firefoxLaunchOptions,
  },
},
```

Add a short comment beside the workaround linking:

- `https://github.com/microsoft/playwright/issues/42768`
- `https://bugzilla.mozilla.org/show_bug.cgi?id=2060476`
- `https://github.com/microsoft/playwright/pull/43494`

The comment must state that the workaround can be removed after Playwright
bundles Firefox 158 or newer and the unmodified Firefox command passes on
macOS 27.

- [ ] **Step 3: Document the workaround and removal condition**

Add a macOS Firefox note to `docs/TESTS.md` explaining:

- Firefox versions bundled before Firefox 158 can fail on macOS 27 because the
  real Firefox app-data directory is protected.
- The smoke config automatically supplies an isolated `CFFIXED_USER_HOME` only
  to Firefox on Darwin 27 or newer.
- The directory is retained under the operating system temp directory.
- The upstream Playwright issue, Mozilla bug, and Playwright Firefox roll.
- Remove the workaround after upgrading to a release with Firefox 158 or newer
  and confirming this command passes without the workaround:

```bash
npm run test:e2e -- --project=firefox --workers=1
```

- [ ] **Step 4: Verify Firefox passes locally**

Run:

```bash
npm run test:e2e -- --project=firefox --workers=1
```

Expected: PASS with 9 tests.

- [ ] **Step 5: Verify the workaround is browser- and platform-scoped**

Run:

```bash
npm run test:e2e -- --project=chromium --project=webkit
npx eslint playwright.smoke.config.js
git diff --check
```

Expected: Chromium and WebKit pass unchanged, the config passes ESLint, and
there are no whitespace errors.

- [ ] **Step 6: Keep the changes uncommitted**

Run:

```bash
git status --short
```

Expected: the Firefox workaround and documentation are present with the
existing smoke-test changes. Do not commit.

### Task 5: Rename human and agent guidance to page contract tests

**Files:**
- Modify: `README.md`
- Modify: `docs/TESTS.md`
- Modify: `.github/workflows/e2e.yml`
- Modify: `.ai/skills/create-new-block/SKILL.md`
- Modify: `.ai/skills/contributor-onboarding/SKILL.md`
- Modify: `.ai/docs/specs/2026-10-14-pattern-library-smoke-tests-design.md`
- Modify: `.ai/docs/plans/2026-10-14-pattern-library-smoke-tests.md`

- [ ] **Step 1: Update human-facing terminology**

Replace descriptive uses of “smoke tests” with “Pattern Library page contract
tests” in `README.md` and `docs/TESTS.md`. Keep these technical interfaces
unchanged:

```text
npm run test:e2e
npm run test:e2e:ui
playwright.smoke.config.js
test/e2e/
playwright-report-smoke/
test-results/smoke/
```

Rename the `docs/TESTS.md` section to `## Pattern Library page contract tests`.
Describe the tests as route-level contracts that verify successful navigation
and stable repository-owned post-decoration hooks.

- [ ] **Step 2: Link the pull-request template directly**

In `docs/TESTS.md`, link “repository pull-request template” to:

```markdown
[repository pull-request template](../.github/PULL_REQUEST_TEMPLATE.md)
```

Keep the explanation of automated test reporting and manual keyboard and
screen-reader expectations.

- [ ] **Step 3: Update workflow display labels**

In `.github/workflows/e2e.yml`, change only the human-facing workflow and step
names:

```yaml
name: Pattern Library page contract tests
```

```yaml
- name: Run Pattern Library page contract tests
  run: npm run test:e2e
```

Do not rename the workflow file, command, artifact name, or artifact paths.

- [ ] **Step 4: Add create-new-block agent guidance**

In `.ai/skills/create-new-block/SKILL.md`, add a `### Pattern Library page
contract tests` subsection after the accessibility-test guidance:

- Unit and accessibility tests remain mandatory for every new block.
- Add or update `test/e2e/pattern-library.spec.js` only when the block has a
  representative Pattern Library route and the change affects its full-page
  composition contract.
- Use a stable repository-owned selector that appears after decoration. Do not
  use the authored block root when it exists before `init(el)` completes.
- Run `npm run test:e2e` when the page contract changes.
- Link to
  `../../../docs/TESTS.md#pattern-library-page-contract-tests`.

- [ ] **Step 5: Add contributor-onboarding agent guidance**

In the “Create a simple authored block” route in
`.ai/skills/contributor-onboarding/SKILL.md`, add a conditional step after unit
and accessibility coverage:

```markdown
If the block has a representative Pattern Library route and this change alters
its full-page composition contract, add or update its repository-owned
post-decoration selector in `test/e2e/pattern-library.spec.js` and run
`npm run test:e2e`. Otherwise, do not add page contract coverage solely because
the block is new.
```

Update the route’s “Done when” text to include a passing page contract only
when that condition applies.

- [ ] **Step 6: Align agent design records**

Replace nonliteral descriptive uses of “smoke tests” and “smoke suite” in the
design and implementation plan with “page contract tests” or “page contract
suite.” Preserve all literal technical names listed in Step 1.

- [ ] **Step 7: Check terminology boundaries**

Run:

```bash
rg -n -i "smoke test|smoke suite|end-to-end smoke" README.md docs/TESTS.md .github/workflows/e2e.yml .ai/skills .ai/docs/specs
```

Expected: no human- or agent-facing descriptive uses remain. Matches are
limited to literal compatibility filenames, artifact paths, or historical
commands where replacing `smoke` would make the command inaccurate.
Review this implementation plan separately because the check command and
compatibility instructions intentionally contain the old terms.

- [ ] **Step 8: Keep the changes uncommitted**

Run:

```bash
git status --short
```

Expected: the complete approved file map from Tasks 1–5 is present, including
the Playwright configuration, route spec, package scripts, workflow,
documentation, design records, and agent skills. No unrelated files are
modified. Do not commit.

### Task 6: Run complete validation

**Files:**
- Verify: `playwright.smoke.config.js`
- Verify: `test/e2e/pattern-library.spec.js`
- Verify: `.github/workflows/e2e.yml`
- Verify: `README.md`
- Verify: `docs/TESTS.md`

- [ ] **Step 1: Confirm page contract discovery**

Run:

```bash
npx playwright test --config=playwright.smoke.config.js --list
```

Expected: PASS and 27 discovered tests.

- [ ] **Step 2: Run the three-browser local page contract suite**

Run:

```bash
npm run test:e2e
```

Expected: PASS with 27 tests.

- [ ] **Step 3: Run the core test baseline**

Run:

```bash
npm test
```

Expected: PASS for unit, extraction, indexer, and link-check unit suites.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no JavaScript or CSS lint errors.

- [ ] **Step 5: Run final repository checks**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the approved page contract, workflow,
documentation, design, plan, and agent-skill files are changed; all work
remains uncommitted.

- [ ] **Step 6: Record ticket handoff details**

Prepare the implementation handoff with:

- SPDOCS-141 initial routes: buttons, cards, core layouts, playground, search,
  status table, table, typography, and usage.
- SPDOCS-141 validation commands and their results.
- SPDOCS-144 canonical guide: `docs/TESTS.md`.
- The future pull-request URL once a pull request is created.

Do not claim a CI dry run or pull-request link until one exists.
