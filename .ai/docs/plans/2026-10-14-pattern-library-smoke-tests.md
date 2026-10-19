# Pattern Library Smoke Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-browser Playwright smoke coverage for three Pattern Library routes and document how contributors run and extend the repository's test suites.

**Architecture:** A dedicated Playwright configuration owns full-page smoke execution, local `aem up` startup, deployed URL overrides, browser projects, and isolated artifacts. One data-driven spec defines the initial route-to-selector contract. A separate pull-request workflow installs all three browsers and preserves reports and retry traces, while `docs/TESTS.md` remains the canonical contributor guide.

**Tech Stack:** Node.js 20, npm, `@playwright/test`, Adobe AEM CLI, GitHub Actions, GitHub-Flavored Markdown.

**Approved TDD exception:** The user approved command-based validation instead of test-first automation for configuration files, package scripts, workflows, and documentation. The smoke spec is itself executable test coverage for existing page behavior. No production application code is added.

**Commit policy:** Do not create commits during implementation. The user explicitly asked to keep task changes uncommitted.

---

## File map

| Path | Responsibility |
| --- | --- |
| `playwright.smoke.config.js` | Configure smoke-only browser projects, base URL selection, local server, retries, traces, reports, and result output. |
| `test/e2e/pattern-library.spec.js` | Define the three route contracts and assert successful navigation plus visible repository-owned block hooks. |
| `package.json` | Expose stable local and UI-mode smoke commands. |
| `.gitignore` | Ignore the dedicated smoke HTML report. |
| `eslint.config.js` | Allow the root smoke configuration to import the existing Playwright dev dependency. |
| `.github/workflows/e2e.yml` | Run the three-browser smoke suite on pull requests targeting `main` and upload artifacts. |
| `README.md` | Add the shortest contributor entry point for installing browsers and running smoke tests. |
| `docs/TESTS.md` | Document runner selection, fixture conventions, smoke routes, environment behavior, CI mapping, and pull-request expectations. |
| `.ai/docs/specs/2026-10-14-pattern-library-smoke-tests-design.md` | Preserve the approved design and scope decisions. |

### Task 1: Add the dedicated smoke suite

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
    name: 'cards',
    path: '/docs/pattern-library/cards',
    selector: '.card-content-container',
  },
  {
    name: 'table',
    path: '/docs/pattern-library/table',
    selector: '.table table',
  },
  {
    name: 'playground',
    path: '/docs/pattern-library/playground',
    selector: '.playground-layout',
  },
];

for (const route of routes) {
  test(`${route.name} pattern composes its block`, async ({ page }) => {
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

Expected: PASS and list 9 tests, consisting of 3 routes across 3 browser projects.

- [ ] **Step 8: Install the local browser binaries**

Run:

```bash
npx playwright install chromium firefox webkit
```

Expected: PASS with all three browser binaries available. Do not edit the dependency manifest if this command only downloads browsers.

- [ ] **Step 9: Run the local smoke suite**

Run:

```bash
npm run test:e2e
```

Expected: PASS with 9 tests. Playwright starts `aem up` on port 3003 and each route exposes its expected visible hook.

- [ ] **Step 10: Verify the deployed URL override**

Run:

```bash
PLAYWRIGHT_BASE_URL=https://main--spectrum-hub--adobe.aem.live npm run test:e2e
```

Expected: PASS with 9 tests and no local `aem up` startup message.

- [ ] **Step 11: Inspect the uncommitted task diff**

Run:

```bash
git diff -- .gitignore eslint.config.js package.json playwright.smoke.config.js test/e2e/pattern-library.spec.js
git status --short
```

Expected: only the intended smoke suite, script, ignore, and existing design-document changes are present. Do not commit.

### Task 2: Add pull-request CI

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Create the dedicated workflow**

Create `.github/workflows/e2e.yml`:

```yaml
name: End-to-end smoke tests

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

      - name: Run end-to-end smoke tests
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
To run the Pattern Library smoke tests in Chromium, Firefox, and WebKit:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

The smoke command starts a local `aem up` server. Set
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

Install all three browsers before running the end-to-end smoke suite:

```bash
npx playwright install chromium firefox webkit
```

CI adds `--with-deps` because Linux runners also need browser system packages.
```

- [ ] **Step 3: Add smoke commands to the command matrix**

Add:

```markdown
| `npm run test:e2e` | Pattern Library smoke tests in Chromium, Firefox, and WebKit | Full-page composition and stable block hooks |
| `npm run test:e2e:ui` | The smoke suite in Playwright UI mode | Local smoke-test authoring and debugging |
| `PLAYWRIGHT_BASE_URL=<url> npm run test:e2e` | The same smoke suite against a deployed site | Branch preview or production validation |
```

Update the paragraph below the table so it also states that `npm test` does not run end-to-end smoke tests.

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

- [ ] **Step 5: Add an end-to-end smoke section**

Place it after accessibility tests and before link checks:

```markdown
## End-to-end smoke tests

`test/e2e/` uses Playwright to verify that representative Pattern Library pages
load and compose stable repository-owned block hooks. The initial routes are:

| Route | Expected hook |
| --- | --- |
| `/docs/pattern-library/cards` | `.card-content-container` |
| `/docs/pattern-library/table` | `.table table` |
| `/docs/pattern-library/playground` | `.playground-layout` |

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
an isolated DOM. Use the smoke suite when a regression would appear only after
a complete page loads and decorates its blocks. Keep smoke assertions on
repository-owned classes or data attributes. Do not assert exact copy,
screenshots, or Spectrum implementation internals.
```

- [ ] **Step 6: Document coverage and pull-request expectations**

Add a concise section or paragraph that states:

```markdown
Web Test Runner collects coverage during `test:unit`, `test:file`, and watch
runs because those scripts pass `--coverage`. Playwright smoke tests protect
page composition and do not produce JavaScript coverage.

Before opening a pull request, use the repository template to record which
automated suites ran and how affected pages were browser tested. Automated
tests do not replace the template's manual keyboard and screen-reader checks
when a change affects interaction, semantics, or accessibility.
```

- [ ] **Step 7: Update CI and validation tables**

Add `.github/workflows/e2e.yml` to the CI mapping:

```markdown
| `.github/workflows/e2e.yml` | Pull requests to `main` | Chromium, Firefox, and WebKit Pattern Library smoke tests |
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

### Task 4: Run complete validation

**Files:**
- Verify: `playwright.smoke.config.js`
- Verify: `test/e2e/pattern-library.spec.js`
- Verify: `.github/workflows/e2e.yml`
- Verify: `README.md`
- Verify: `docs/TESTS.md`

- [ ] **Step 1: Confirm smoke discovery**

Run:

```bash
npx playwright test --config=playwright.smoke.config.js --list
```

Expected: PASS and 9 discovered tests.

- [ ] **Step 2: Run the three-browser local smoke suite**

Run:

```bash
npm run test:e2e
```

Expected: PASS with 9 tests.

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

Expected: no whitespace errors; only the approved smoke, workflow, documentation, design, and plan files are changed; all work remains uncommitted.

- [ ] **Step 6: Record ticket handoff details**

Prepare the implementation handoff with:

- SPDOCS-141 initial routes: cards, table, and playground.
- SPDOCS-141 validation commands and their results.
- SPDOCS-144 canonical guide: `docs/TESTS.md`.
- The future pull-request URL once a pull request is created.

Do not claim a CI dry run or pull-request link until one exists.
