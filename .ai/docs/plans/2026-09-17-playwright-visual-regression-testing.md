# Playwright Visual Regression Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Playwright visual regression coverage for every supported block and shared-component fixture, plus representative page smoke states, with human-reviewed Linux baselines.

**Architecture:** Keep VRT in an independent `test/visual/` Playwright suite with four Chromium projects: desktop/mobile and light/dark. Reuse the existing AEM server, fixture HTML, route mocks, and a neutral navigation helper, but keep visual assertions, reports, baselines, and CI separate from accessibility testing. Pull requests compare committed Linux baselines; a manual GitHub Actions workflow generates updated baselines as downloadable artifacts and never commits them.

**Tech Stack:** Playwright Test 1.62.1 as locked in `package-lock.json`, Adobe AEM CLI, Node.js 20, GitHub Actions, committed PNG baselines.

**Design spec:** `.ai/docs/specs/2026-09-17-playwright-visual-regression-testing-design.md`

**Implementation reconciliation:** `page-nav` uses a bespoke four-project test because its component is intentionally absent at mobile widths; the mobile scenarios initialize it at desktop width, restore the mobile viewport, assert that the navigation is hidden, and capture that absence. The planned `columns-grid` case was not added because `columns-grid.html` does not exist on `main`; the coverage test will require a visual spec if that fixture is introduced.

---

## File structure

### Shared test support

- Create `test/playwright/fixture.js` — register route mocks and navigate to a fixture or page with the existing ready-selector contract.
- Modify `test/a11y/block-a11y.js` — retain only accessibility-specific violation formatting and re-export or import the shared navigation helper during migration.
- Modify `test/a11y/blocks/*.spec.js` and `test/a11y/custom-components/*.spec.js` — import fixture navigation from the neutral support module.

### Visual runner and utilities

- Create `playwright.visual.config.js` — four visual projects, dedicated outputs, Linux baseline naming, AEM server, strict screenshot policy.
- Create `test/visual/visual-test.js` — define deterministic fixture navigation and screenshot behavior.
- Create `test/visual/visual-test.node.test.js` — unit-test validation and naming behavior that does not require a browser.
- Create `test/visual/coverage.node.test.js` — enforce coverage for every supported HTML fixture.
- Create `test/visual/README.md` — authoring, local debugging, CI, and baseline-review instructions.
- Modify `package.json` — add visual test and coverage scripts.

### Fixture specs

- Create `test/visual/blocks/<fixture-name>.spec.js` for each supported root fixture in `test/a11y/fixtures/`.
- Create `test/visual/custom-components/<fixture-name>.spec.js` for each fixture in `test/a11y/fixtures/custom-components/`.
- Generate `*-snapshots/*.png` directories beside each visual spec through Linux CI.

### Page smoke coverage

- Create `test/visual/pages/homepage.spec.js` — homepage default and search-open states.
- Create `test/visual/pages/swc-button.spec.js` — component-detail shell and playground states at `/web/swc/components/button`.

### Continuous integration

- Create `.github/workflows/visual.yml` — non-required pull request comparison job.
- Create `.github/workflows/visual-baselines.yml` — manual Linux baseline-generation job.
- Modify `.ai/README.md` and `AGENTS.md` — register the VRT conventions and coverage expectation.

---

### Task 1: Extract neutral Playwright fixture navigation

**Files:**
- Create: `test/playwright/fixture.js`
- Modify: `test/a11y/block-a11y.js`
- Modify: `test/a11y/blocks/*.spec.js`
- Modify: `test/a11y/custom-components/*.spec.js`
- Test: `test/a11y/blocks/card.spec.js`
- Test: `test/a11y/blocks/section-metadata.spec.js`
- Test: `test/a11y/blocks/sitenav.spec.js`

- [ ] **Step 1: Run representative accessibility tests before the refactor**

Run:

```bash
npx playwright test test/a11y/blocks/card.spec.js test/a11y/blocks/section-metadata.spec.js test/a11y/blocks/sitenav.spec.js --project=chromium
```

Expected: PASS. This establishes coverage for string readiness, detached-element readiness, and custom post-navigation setup.

- [ ] **Step 2: Move `gotoBlock()` into neutral test support**

Create `test/playwright/fixture.js`:

```js
export async function gotoFixture(page, {
  path, readySelector, routes = [],
}) {
  for (const { url, contentType, body } of routes) {
    await page.route(url, (route) => route.fulfill({ contentType, body }));
  }

  await page.goto(path);

  if (typeof readySelector === 'string') {
    await page.waitForSelector(readySelector);
  } else if (readySelector?.selector) {
    await page.waitForSelector(readySelector.selector, { state: readySelector.state });
  } else {
    await page.waitForLoadState('networkidle');
  }
}
```

In `test/a11y/block-a11y.js`, delete the local navigation implementation and keep `formatViolations()`. Do not add visual behavior to this file.

- [ ] **Step 3: Update accessibility imports and calls**

In every file under `test/a11y/blocks/` and `test/a11y/custom-components/`:

```js
import { gotoFixture } from '../../playwright/fixture.js';
import { formatViolations } from '../block-a11y.js';
```

For custom-component specs, use `../../playwright/fixture.js`; for block specs, use the same relative path. Replace `gotoBlock(page, config)` with `gotoFixture(page, config)`.

Keep imports from `block-a11y.js` only for `formatViolations`. Do not change fixture metadata or test behavior.

- [ ] **Step 4: Run the representative accessibility tests**

Run:

```bash
npx playwright test test/a11y/blocks/card.spec.js test/a11y/blocks/section-metadata.spec.js test/a11y/blocks/sitenav.spec.js --project=chromium
```

Expected: PASS with the same test count as Step 1.

- [ ] **Step 5: Run the full accessibility suite**

Run:

```bash
npm run test:a11y
```

Expected: PASS for Desktop Chrome and Mobile Chrome.

- [ ] **Step 6: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/playwright/fixture.js test/a11y
git commit -m "refactor(test): share Playwright fixture navigation"
```

---

### Task 2: Add the visual runner, utility validation, and card pilot

**Files:**
- Create: `playwright.visual.config.js`
- Create: `test/visual/visual-test.js`
- Create: `test/visual/visual-test.node.test.js`
- Create: `test/visual/blocks/card.spec.js`
- Modify: `package.json`
- Modify: `.gitignore`
- Generate: `test/visual/blocks/card.spec.js-snapshots/*.png`

- [ ] **Step 1: Write failing unit tests for visual-case validation**

Create `test/visual/visual-test.node.test.js`:

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeVisualCase } from './visual-test.js';

describe('normalizeVisualCase', () => {
  it('requires a fixture path and visual root', () => {
    assert.throws(
      () => normalizeVisualCase({ name: 'card' }),
      /card.*path.*visualRoot/i,
    );
  });

  it('preserves deterministic fixture metadata', () => {
    assert.deepEqual(
      normalizeVisualCase({
        name: 'card',
        path: '/test/a11y/fixtures/card.html',
        readySelector: '.card-content-container',
        visualRoot: '.card',
      }),
      {
        name: 'card',
        path: '/test/a11y/fixtures/card.html',
        readySelector: '.card-content-container',
        routes: [],
        visualRoot: '.card',
        prepare: undefined,
        screenshotOptions: {},
      },
    );
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```bash
node --test test/visual/visual-test.node.test.js
```

Expected: FAIL because `test/visual/visual-test.js` does not exist.

- [ ] **Step 3: Implement visual-case normalization and registration**

Create `test/visual/visual-test.js`:

```js
import { test, expect } from '@playwright/test';
import { gotoFixture } from '../playwright/fixture.js';

export function normalizeVisualCase(config) {
  const missing = ['name', 'path', 'visualRoot'].filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`${config.name ?? 'Visual case'} requires ${missing.join(', ')}`);
  }

  return {
    name: config.name,
    path: config.path,
    readySelector: config.readySelector,
    routes: config.routes ?? [],
    visualRoot: config.visualRoot,
    prepare: config.prepare,
    screenshotOptions: config.screenshotOptions ?? {},
  };
}

async function waitForVisualAssets(locator) {
  await locator.page().evaluate(async () => document.fonts.ready);
  await locator.evaluate(async (root) => {
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map((image) => {
      if (image.complete) return image.decode().catch(() => {});
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

export function defineVisualFixture(input) {
  const visualCase = normalizeVisualCase(input);

  test(`${visualCase.name} matches its visual baseline`, async ({ page }) => {
    await gotoFixture(page, visualCase);
    if (visualCase.prepare) await visualCase.prepare(page);

    const root = page.locator(visualCase.visualRoot);
    await expect(root).toBeVisible();
    await waitForVisualAssets(root);
    await expect(root).toHaveScreenshot(
      `${visualCase.name}.png`,
      visualCase.screenshotOptions,
    );
  });
}
```

Do not catch navigation, image, or screenshot errors. A broken image may resolve its wait through `error`, but the browser's broken-image rendering remains visible in the screenshot.

- [ ] **Step 4: Run the utility tests**

Run:

```bash
node --test test/visual/visual-test.node.test.js
```

Expected: PASS.

- [ ] **Step 5: Add the four-project visual configuration**

Create `playwright.visual.config.js`:

```js
import { defineConfig, devices } from '@playwright/test';

const desktop = devices['Desktop Chrome'];
const mobile = devices['Pixel 5'];

export default defineConfig({
  testDir: './test/visual',
  testMatch: ['**/*.spec.js'],
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
    },
  },
  reporter: process.env.CI
    ? [
      ['github'],
      ['html', { outputFolder: 'playwright-report-visual', open: 'never' }],
    ]
    : [
      ['list'],
      ['html', { outputFolder: 'playwright-report-visual', open: 'never' }],
    ],
  webServer: {
    command: 'npx aem up --port 3003 --no-open',
    port: 3003,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-light',
      use: { ...desktop, colorScheme: 'light' },
    },
    {
      name: 'desktop-dark',
      use: { ...desktop, colorScheme: 'dark' },
    },
    {
      name: 'mobile-light',
      use: { ...mobile, colorScheme: 'light' },
    },
    {
      name: 'mobile-dark',
      use: { ...mobile, colorScheme: 'dark' },
    },
  ],
});
```

The snapshot path intentionally omits `{platform}`. Baselines are generated only by the pinned Ubuntu workflow later in this plan.

- [ ] **Step 6: Add package scripts**

Add to `package.json`:

```json
"test:visual:unit": "node --test test/visual/*.node.test.js",
"test:visual:browser": "playwright test --config=playwright.visual.config.js",
"test:visual": "npm run test:visual:unit && npm run test:visual:browser"
```

- [ ] **Step 7: Ignore generated visual reports**

Add to `.gitignore` beside the existing Playwright report entries:

```gitignore
playwright-report-visual/
```

`test-results/visual/` is already covered by the existing `test-results/` rule.

- [ ] **Step 8: Add the card pilot**

Create `test/visual/blocks/card.spec.js`:

```js
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'card',
  path: '/test/a11y/fixtures/card.html',
  readySelector: '.card-content-container',
  visualRoot: '.card',
});
```

- [ ] **Step 9: Verify the browser test fails without baselines**

Run:

```bash
npx playwright test --config=playwright.visual.config.js test/visual/blocks/card.spec.js
```

Expected: FAIL four times because the Linux-authoritative baseline files do not exist. Confirm Playwright writes one actual image for each project and does not report a false pass.

- [ ] **Step 10: Generate temporary pilot baselines to validate determinism**

Run:

```bash
npx playwright test --config=playwright.visual.config.js test/visual/blocks/card.spec.js --update-snapshots
npx playwright test --config=playwright.visual.config.js test/visual/blocks/card.spec.js
```

Expected: both commands PASS locally. These local images validate test wiring only; remove them before importing Linux-generated baselines unless the executor itself is running in the pinned Ubuntu environment.

- [ ] **Step 11: Create a checkpoint commit only if the user has authorized commits**

```bash
git add .gitignore package.json playwright.visual.config.js test/visual/visual-test.js test/visual/visual-test.node.test.js test/visual/blocks/card.spec.js
git commit -m "test(visual): add Playwright VRT pilot"
```

Do not commit locally generated macOS baselines.

---

### Task 3: Add straightforward block fixture specs

**Files:**
- Create: `test/visual/blocks/action-button.spec.js`
- Create: `test/visual/blocks/banner.spec.js`
- Create: `test/visual/blocks/breadcrumbs.spec.js`
- Create: `test/visual/blocks/component-status.spec.js`
- Create: `test/visual/blocks/footer.spec.js`
- Create: `test/visual/blocks/header.spec.js`
- Create: `test/visual/blocks/hero.spec.js`
- Create: `test/visual/blocks/media.spec.js`
- Create: `test/visual/blocks/page-hero.spec.js`
- Create: `test/visual/blocks/page-nav.spec.js`
- Create: `test/visual/blocks/table.spec.js`
- Create: `test/visual/blocks/usage.spec.js`
- Create: `test/visual/blocks/youtube.spec.js`

- [ ] **Step 1: Add one visual definition per straightforward fixture**

Use the `card.spec.js` shape from Task 2 with this exact metadata:

| Spec | Ready selector | Visual root |
| --- | --- | --- |
| `action-button.spec.js` | `button.action-button-primary` | `.action-button` |
| `banner.spec.js` | `.banner .se-button` | `.banner` |
| `breadcrumbs.spec.js` | `.breadcrumbs ol` | `.breadcrumbs` |
| `component-status.spec.js` | `.component-status-pill` | `.component-status` |
| `footer.spec.js` | `.footer-content` | `.footer` |
| `header.spec.js` | `.skip-link` | `header` |
| `hero.spec.js` | `.hero-foreground` | `.hero` |
| `media.spec.js` | `.media[style]` | `.media` |
| `page-hero.spec.js` | `.component-status-pill` | `.page-hero` |
| `page-nav.spec.js` | `nav.page-nav` | `nav.page-nav` |
| `table.spec.js` | `.table table` | `.table` |
| `usage.spec.js` | `.usage-panel` | `.usage` |
| `youtube.spec.js` | `iframe` | `.video` |

Each `path` is `/test/a11y/fixtures/<spec-base-name>.html`, and each `name` is the spec base name. If a visual root differs from the rendered root after inspection, correct the selector in the spec rather than widening it to `main`.

- [ ] **Step 2: Port deterministic routes from accessibility specs**

For fixtures whose matching `test/a11y/blocks/<name>.spec.js` declares `routes`, import the same named mock exports from `test/a11y/mocks.js` and copy the route definitions into the visual case. Do not duplicate mock payloads.

At minimum, review:

```text
test/a11y/blocks/banner.spec.js
test/a11y/blocks/component-status.spec.js
test/a11y/blocks/footer.spec.js
test/a11y/blocks/header.spec.js
test/a11y/blocks/page-hero.spec.js
test/a11y/blocks/youtube.spec.js
```

- [ ] **Step 3: Generate temporary screenshots and inspect capture boundaries**

Run:

```bash
npx playwright test --config=playwright.visual.config.js \
  test/visual/blocks/action-button.spec.js \
  test/visual/blocks/banner.spec.js \
  test/visual/blocks/breadcrumbs.spec.js \
  test/visual/blocks/component-status.spec.js \
  test/visual/blocks/footer.spec.js \
  test/visual/blocks/header.spec.js \
  test/visual/blocks/hero.spec.js \
  test/visual/blocks/media.spec.js \
  test/visual/blocks/page-hero.spec.js \
  test/visual/blocks/page-nav.spec.js \
  test/visual/blocks/table.spec.js \
  test/visual/blocks/usage.spec.js \
  test/visual/blocks/youtube.spec.js \
  --update-snapshots
```

Expected: PASS. Inspect every capture for accidental fixture whitespace, clipped overlays, live remote content, missing fonts, and broken images.

- [ ] **Step 4: Verify a second run is deterministic**

Run the same command without `--update-snapshots`.

Expected: PASS with no changed PNG files.

- [ ] **Step 5: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/blocks/*.spec.js
git commit -m "test(visual): cover stable block fixtures"
```

Do not commit macOS-generated baselines.

---

### Task 4: Add complex, responsive, and multi-fixture block specs

**Files:**
- Create: `test/visual/blocks/columns.spec.js`
- Create: `test/visual/blocks/columns-grid.spec.js`
- Create: `test/visual/blocks/playground.spec.js`
- Create: `test/visual/blocks/profile.spec.js`
- Create: `test/visual/blocks/profile-signed-in.spec.js`
- Create: `test/visual/blocks/search.spec.js`
- Create: `test/visual/blocks/sitenav.spec.js`
- Create: `test/visual/blocks/status-table.spec.js`

- [ ] **Step 1: Add the columns fixture cases**

Create `columns.spec.js` with:

```js
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'columns',
  path: '/test/a11y/fixtures/columns.html',
  readySelector: '.col-1',
  visualRoot: '.columns',
});
```

Create `columns-grid.spec.js` with:

```js
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'columns-grid',
  path: '/test/a11y/fixtures/columns-grid.html',
  readySelector: '.grid-column',
  visualRoot: '.columns',
});
```

- [ ] **Step 2: Add profile signed-out and signed-in cases**

Use `test/a11y/blocks/profile.spec.js` as the source of its route mocks.

```js
defineVisualFixture({
  name: 'profile',
  path: '/test/a11y/fixtures/profile.html',
  readySelector: 'se-profile se-button',
  visualRoot: 'se-profile',
  routes,
});
```

```js
defineVisualFixture({
  name: 'profile-signed-in',
  path: '/test/a11y/fixtures/profile-signed-in.html',
  readySelector: 'se-profile #avatar-button',
  visualRoot: 'se-profile',
  routes: signedInRoutes,
});
```

Name the local route arrays clearly and reuse payloads from `test/a11y/mocks.js`.

- [ ] **Step 3: Add playground, search, and status-table cases**

Use these roots and readiness contracts:

| Spec | Ready selector | Visual root |
| --- | --- | --- |
| `playground.spec.js` | `.playground-layout` | `.playground` |
| `search.spec.js` | `sh-search .hit-title` | `sh-search` |
| `status-table.spec.js` | `.status-table-table` | `.status-table` |

Port every route mock from the matching a11y spec.

Do not create `schedule.spec.js` in this rollout. The current schedule fixture exercises a known block defect: `schedule.js` does not consume `loadFragment()`'s return shape correctly, so the authored link is removed without producing a deterministic schedule component. Track the fixture as a reasoned no-meaningful-rendering exemption in Task 6 rather than capturing an empty section or widening the screenshot to unrelated page content.

- [ ] **Step 4: Add responsive sitenav setup**

Create `test/visual/blocks/sitenav.spec.js` using the existing `navAreasFragment` and `sitenavIndex` mocks. The `prepare` function must open the mobile navigation only when the project viewport is below the 900px breakpoint:

```js
defineVisualFixture({
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  visualRoot: '#sitenav',
  routes,
  prepare: async (page) => {
    const isMobile = (page.viewportSize()?.width ?? 0) < 900;
    if (isMobile) {
      await page.waitForSelector('.sitenav-trigger-btn');
      await page.click('.sitenav-trigger-btn');
    }
    await page.waitForSelector('#sitenav .level-1-list');
  },
});
```

If the mobile trigger is outside `#sitenav` and is visually part of the required state, set `visualRoot` to the smallest common stable container rather than dropping the trigger from coverage.

- [ ] **Step 5: Verify all complex fixtures create stable local screenshots**

Run:

```bash
npx playwright test --config=playwright.visual.config.js \
  test/visual/blocks/columns.spec.js \
  test/visual/blocks/columns-grid.spec.js \
  test/visual/blocks/playground.spec.js \
  test/visual/blocks/profile.spec.js \
  test/visual/blocks/profile-signed-in.spec.js \
  test/visual/blocks/search.spec.js \
  test/visual/blocks/sitenav.spec.js \
  test/visual/blocks/status-table.spec.js \
  --update-snapshots
```

Expected: PASS. Run the command again without `--update-snapshots`; expected PASS with no PNG changes.

- [ ] **Step 6: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/blocks/*.spec.js
git commit -m "test(visual): cover interactive block fixtures"
```

Do not commit macOS-generated baselines.

---

### Task 5: Add shared custom-element fixture specs

**Files:**
- Create: `test/visual/custom-components/se-button.spec.js`
- Create: `test/visual/custom-components/se-checkbox.spec.js`
- Create: `test/visual/custom-components/se-dialog.spec.js`
- Create: `test/visual/custom-components/se-input.spec.js`
- Create: `test/visual/custom-components/se-segmentedcontrol.spec.js`
- Create: `test/visual/custom-components/se-select.spec.js`
- Create: `test/visual/custom-components/se-switch.spec.js`
- Create: `test/visual/custom-components/se-textarea.spec.js`

- [ ] **Step 1: Add one visual definition per shared-component fixture**

Each spec uses `.test-container` as `visualRoot` and `/test/a11y/fixtures/custom-components/<name>.html` as `path`.

| Name | Ready selector |
| --- | --- |
| `se-button` | `se-button button` |
| `se-checkbox` | `se-checkbox input` |
| `se-dialog` | `se-dialog dialog[open]` |
| `se-input` | `se-input input` |
| `se-segmentedcontrol` | `se-segmentedcontrol input[type="radio"]` |
| `se-select` | `se-select select` |
| `se-switch` | `se-switch input` |
| `se-textarea` | `se-textarea textarea` |

Example:

```js
import { defineVisualFixture } from '../visual-test.js';

defineVisualFixture({
  name: 'se-button',
  path: '/test/a11y/fixtures/custom-components/se-button.html',
  readySelector: 'se-button button',
  visualRoot: '.test-container',
});
```

- [ ] **Step 2: Generate and inspect temporary screenshots**

Run:

```bash
npx playwright test --config=playwright.visual.config.js test/visual/custom-components --update-snapshots
npx playwright test --config=playwright.visual.config.js test/visual/custom-components
```

Expected: both commands PASS. Verify disabled, error, selected, checked, and open states already present in each fixture remain visible in the capture.

- [ ] **Step 3: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/custom-components/*.spec.js
git commit -m "test(visual): cover shared custom elements"
```

Do not commit macOS-generated baselines.

---

### Task 6: Enforce fixture-level visual coverage

**Files:**
- Create: `test/visual/coverage.node.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the coverage test with no exemptions**

Create `test/visual/coverage.node.test.js`. It must:

1. Recursively inventory `.html` files under `test/a11y/fixtures/`.
2. Map a root fixture such as `profile-signed-in.html` to `test/visual/blocks/profile-signed-in.spec.js`.
3. Map `custom-components/se-button.html` to `test/visual/custom-components/se-button.spec.js`.
4. Verify the expected spec exists.
5. Read the spec and verify it contains the exact fixture route.
6. Report all missing or mismatched entries in one assertion.

Use an initially empty `EXEMPT_FIXTURES` map whose values must be non-empty reasons:

```js
const EXEMPT_FIXTURES = new Map();
```

- [ ] **Step 2: Run the coverage test to expose non-visual fixtures**

Run:

```bash
node --test test/visual/coverage.node.test.js
```

Expected: FAIL for `schedule.html` and `section-metadata.html`. The schedule fixture does not currently produce a deterministic component, and section metadata removes its own rendered root.

- [ ] **Step 3: Add the documented no-rendering exemptions**

```js
const EXEMPT_FIXTURES = new Map([
  [
    'schedule.html',
    'The current block fails before it produces a deterministic schedule component because its loadFragment return-shape handling is defective.',
  ],
  [
    'section-metadata.html',
    'The block applies section configuration and removes its own root, leaving no visual component to capture.',
  ],
]);
```

The test must also fail if an exemption points to a fixture that no longer exists or has an empty reason.

- [ ] **Step 4: Run visual unit and coverage tests**

Run:

```bash
npm run test:visual:unit
```

Expected: PASS for utility validation and complete fixture coverage.

- [ ] **Step 5: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/coverage.node.test.js package.json
git commit -m "test(visual): enforce fixture coverage"
```

---

### Task 7: Add representative page smoke states

**Files:**
- Create: `test/visual/pages/homepage.spec.js`
- Create: `test/visual/pages/swc-button.spec.js`
- Modify: `test/a11y/mocks.js` only if a reusable deterministic page mock is missing

- [ ] **Step 1: Add the homepage default state**

Use ordinary Playwright tests rather than `defineVisualFixture`, because page smoke tests contain more than one state:

```js
import { test, expect } from '@playwright/test';

test.describe('homepage visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => document.fonts.ready);
  });

  test('default page matches its baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
    });
  });
});
```

Mock volatile network responses before `page.goto()`. Prefer stable local content and narrow route mocks over masking whole regions.

- [ ] **Step 2: Add the homepage search-open state**

In the same spec:

```js
test('open search matches its baseline', async ({ page }) => {
  await page.getByRole('button', { name: 'Search' }).click();
  const search = page.locator('sh-search');
  await expect(search).toBeVisible();
  await expect(search).toHaveScreenshot('homepage-search-open.png');
});
```

Reuse the nav-area and search response mocks from `test/a11y/blocks/search.spec.js`. If the accessible button name differs on the real page, use its actual role and accessible name; do not use a brittle generated class solely to make the test pass.

- [ ] **Step 3: Add the SWC Button component-detail state**

Create `test/visual/pages/swc-button.spec.js`:

```js
import { test, expect } from '@playwright/test';

test.describe('SWC Button page visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/web/swc/components/button');
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => document.fonts.ready);
  });

  test('component detail shell matches its baseline', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(main).toHaveScreenshot('swc-button-detail.png');
  });

  test('playground matches its baseline', async ({ page }) => {
    const playground = page.locator('.playground');
    await expect(playground).toBeVisible();
    await expect(playground).toHaveScreenshot('swc-button-playground.png');
  });
});
```

Intercept generated-data requests with stable repository fixtures or response bodies already used by `test/a11y/blocks/playground.spec.js`. Do not depend on mutable Algolia or authentication responses.

- [ ] **Step 4: Generate and inspect temporary page screenshots**

Run:

```bash
npx playwright test --config=playwright.visual.config.js test/visual/pages --update-snapshots
npx playwright test --config=playwright.visual.config.js test/visual/pages
```

Expected: both commands PASS. Confirm captures contain no signed-in identity, timestamps, live search results, unexpected cookie UI, or loading skeletons.

- [ ] **Step 5: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/pages/*.spec.js test/a11y/mocks.js
git commit -m "test(visual): add page smoke coverage"
```

Do not commit macOS-generated baselines.

---

### Task 8: Add pull request and baseline-generation workflows

**Files:**
- Create: `.github/workflows/visual.yml`
- Create: `.github/workflows/visual-baselines.yml`

- [ ] **Step 1: Add the non-blocking pull request workflow**

Create `.github/workflows/visual.yml`:

```yaml
name: Visual regression

on:
  pull_request:
    branches: [main]

concurrency:
  group: visual-${{ github.ref }}
  cancel-in-progress: true

jobs:
  visual:
    runs-on: ubuntu-24.04
    container:
      image: mcr.microsoft.com/playwright:v1.62.1-noble
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

      - name: Run visual regression tests
        run: npm run test:visual

      - name: Upload visual regression report
        if: failure() || cancelled()
        uses: actions/upload-artifact@v4
        with:
          name: visual-regression-report
          path: |
            playwright-report-visual/
            test-results/visual/
          if-no-files-found: error
          retention-days: 30
```

Do not add repository rules or required-check configuration. The workflow runs on every pull request but remains non-required during stabilization.

- [ ] **Step 2: Add the manual baseline workflow**

Create `.github/workflows/visual-baselines.yml`:

```yaml
name: Update visual baselines

on:
  workflow_dispatch:

concurrency:
  group: visual-baselines-${{ github.ref }}
  cancel-in-progress: true

jobs:
  baselines:
    runs-on: ubuntu-24.04
    container:
      image: mcr.microsoft.com/playwright:v1.62.1-noble
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

      - name: Verify visual test metadata
        run: npm run test:visual:unit

      - name: Generate visual baselines
        run: npx playwright test --config=playwright.visual.config.js --update-snapshots

      - name: Upload visual baselines
        uses: actions/upload-artifact@v4
        with:
          name: visual-baselines-${{ github.sha }}
          path: test/visual/**/*-snapshots/*.png
          if-no-files-found: error
          retention-days: 30
```

Do not grant `contents: write`, create commits, or push from this workflow.

Using the same versioned Playwright Noble container in both workflows pins the browser binaries, Linux distribution, and installed system fonts used for strict pixel comparisons. Keep the image version aligned with the locked `@playwright/test` version whenever Playwright is upgraded.

- [ ] **Step 3: Validate workflow syntax and repository lint**

Run:

```bash
npm run lint:js
```

Expected: PASS. If the repository has `actionlint` available, also run:

```bash
actionlint .github/workflows/visual.yml .github/workflows/visual-baselines.yml
```

Expected: PASS. Do not install a new linter solely for this task.

- [ ] **Step 4: Create a checkpoint commit only if the user has authorized commits**

```bash
git add .github/workflows/visual.yml .github/workflows/visual-baselines.yml
git commit -m "ci: add Playwright visual regression workflows"
```

---

### Task 9: Generate, review, and import authoritative Linux baselines

**Files:**
- Generate: `test/visual/**/*.spec.js-snapshots/*.png`

**Bootstrap prerequisite:** GitHub accepts `workflow_dispatch` only for workflow files that already exist on the default branch. The initial VRT introduction therefore uses two pull requests:

1. The first pull request lands Tasks 1–8 and the documentation in Task 10 without PNG baselines. Complete Task 10 before entering the remaining steps in this task. The new non-required visual check is expected to fail on missing baselines during this one-time bootstrap.
2. After that pull request merges, create or use a follow-up branch from the updated `main`, dispatch the now-default baseline workflow, import the reviewed PNGs, and complete Tasks 9 and 11.

Do not claim that `gh workflow run --ref <feature-branch>` can bootstrap a workflow that does not yet exist on `main`.

- [ ] **Step 1: Verify the baseline workflow exists on the default branch**

Run:

```bash
gh api --method GET repos/adobe/spectrum-hub/contents/.github/workflows/visual-baselines.yml \
  -f ref=main --silent
```

Expected: SUCCESS. If GitHub returns 404, stop and merge the first, baseline-free pull request before continuing.

- [ ] **Step 2: Push the follow-up implementation branch only with explicit user approval**

```bash
git push -u origin HEAD
```

Expected: the branch is available for workflow dispatch.

- [ ] **Step 3: Dispatch baseline generation for the branch**

```bash
gh workflow run visual-baselines.yml --ref "$(git branch --show-current)"
```

Expected: GitHub accepts a new `Update visual baselines` run.

- [ ] **Step 4: Watch the workflow**

Find the run:

```bash
gh run list --workflow=visual-baselines.yml --branch="$(git branch --show-current)" --limit=1
```

Then watch the returned run ID:

```bash
gh run watch <run-id> --exit-status
```

Expected: SUCCESS.

- [ ] **Step 5: Download the baseline artifact outside the repository**

```bash
mkdir -p "$HOME/Downloads/spectrum-hub-visual-baselines"
gh run download <run-id> \
  --name "visual-baselines-$(git rev-parse HEAD)" \
  --dir "$HOME/Downloads/spectrum-hub-visual-baselines"
```

Expected: the download contains four PNGs per visual test: desktop-light, desktop-dark, mobile-light, and mobile-dark.

- [ ] **Step 6: Review every generated baseline**

Verify:

- The intended component or region is fully visible.
- Light and dark modes differ where expected.
- Desktop and mobile layouts represent their actual breakpoints.
- No loading, animation midpoint, caret, signed-in identity, timestamp, or live remote data appears.
- No broad mask or tolerance hides a defect.
- Filenames use stable scenario and project names.

If any image is unstable or wrong, fix its test or fixture and regenerate the complete artifact. Do not edit PNGs manually.

- [ ] **Step 7: Copy the approved artifact into the repository**

`actions/upload-artifact` uses `test/visual/` as the common root before the wildcard, so the downloaded directory contains `blocks/`, `custom-components/`, and `pages/`. Copy those directories into the repository's existing `test/visual/` directory:

```bash
cp -R "$HOME/Downloads/spectrum-hub-visual-baselines"/. test/visual/
```

This preserves every `*.spec.js-snapshots/` directory without overwriting spec source files because the artifact contains PNG files only.

Run:

```bash
git --no-pager status --short test/visual
```

Expected: only the reviewed PNG baselines are newly added or changed.

- [ ] **Step 8: Run the full visual suite against Linux baselines**

If the executor is on macOS, the local pixel comparison is informative but not authoritative. The required verification is the pull request `Visual regression` workflow in Ubuntu.

Run locally:

```bash
npm run test:visual:unit
```

Expected: PASS.

Push the baseline changes only with explicit approval, then verify:

```bash
gh pr checks --watch
```

Expected: the `Visual regression` check passes in Ubuntu.

- [ ] **Step 9: Create a baseline commit only if the user has authorized commits**

```bash
git add ':(glob)test/visual/**/*-snapshots/*.png'
git commit -m "test(visual): add Linux screenshot baselines"
```

---

### Task 10: Document VRT ownership and operating procedures

**Files:**
- Create: `test/visual/README.md`
- Modify: `.ai/README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the visual-testing guide**

Create `test/visual/README.md` with these sections:

```markdown
# Visual regression tests

## What the suite covers
## Running fixture tests locally
## Why Linux CI owns baselines
## Generating baseline artifacts
## Reviewing expected, actual, and diff images
## Adding a fixture or visual state
## Handling dynamic content
## Scenario-specific tolerance policy
## Coverage exemptions
## Stabilization and required-check policy
## Troubleshooting
```

Include the exact commands:

```bash
npm run test:visual
npx playwright test --config=playwright.visual.config.js test/visual/blocks/card.spec.js
npx playwright show-report playwright-report-visual
gh workflow run visual-baselines.yml --ref <branch>
```

State explicitly:

- Local macOS screenshots are not approved baselines.
- Only the manual Ubuntu workflow produces baselines for commits.
- The workflow never commits or pushes.
- A baseline change receives the same review as a source change.
- Global screenshot tolerances are prohibited.
- A fixture exemption requires a meaningful-rendering reason.

- [ ] **Step 2: Register VRT in agent documentation**

Add a concise Visual regression tests section to `.ai/README.md` and `AGENTS.md` beside the accessibility-testing guidance. Point agents to:

- `test/visual/README.md`
- `playwright.visual.config.js`
- `test/visual/coverage.node.test.js`
- The requirement to add VRT for every new supported fixture.

Follow `.ai/rules/write-documentation.md`.

- [ ] **Step 3: Run documentation-linked checks**

Run:

```bash
npm run test:visual:unit
npm run lint:js
```

Expected: PASS.

- [ ] **Step 4: Create a checkpoint commit only if the user has authorized commits**

```bash
git add test/visual/README.md .ai/README.md AGENTS.md
git commit -m "docs: document visual regression testing"
```

---

### Task 11: Final stabilization verification

**Files:**
- Modify only files needed to resolve failures caused by the VRT rollout.

- [ ] **Step 1: Run all directly affected local checks**

Run:

```bash
npm run test:visual:unit
npm run test:a11y
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Run the visual suite twice in the authoritative Linux workflow**

Trigger the pull request workflow with the committed baselines, then rerun the successful workflow once from GitHub.

Expected: both Ubuntu runs PASS with identical committed baselines and no screenshot updates.

- [ ] **Step 3: Verify failure artifacts deliberately**

On a temporary local change, alter one deterministic fixture style enough to create a visible difference and run its visual test in the same environment as its baseline.

Expected:

- The test fails.
- `test-results/visual/` contains expected, actual, and diff images.
- `playwright-report-visual/` identifies the scenario and project.

Revert only this deliberate temporary change and generated failure output. Do not revert unrelated working-tree changes.

- [ ] **Step 4: Verify coverage enforcement deliberately**

Create a temporary fixture file under `test/a11y/fixtures/` without a visual spec and run:

```bash
npm run test:visual:unit
```

Expected: FAIL with the missing fixture and expected visual spec path. Remove only the temporary fixture and rerun; expected PASS.

- [ ] **Step 5: Record stabilization evidence**

In the pull request description, record:

- Linux VRT run URLs.
- Total visual scenarios and resulting screenshot count.
- Total runtime.
- Any scenario-specific tolerance and its reason.
- Confirmation that failure artifacts were inspected.
- Confirmation that the check remains non-required.

- [ ] **Step 6: Create a final implementation commit only if the user has authorized commits**

```bash
git add -A
git commit -m "test(visual): introduce Playwright visual regression coverage"
```

Before running `git add -A`, inspect `git status` and stage only VRT-related files. If earlier checkpoint commits were created, skip this aggregate commit and leave the branch as a clean sequence of focused commits.
