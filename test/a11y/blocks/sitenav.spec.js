import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import {
  cachedSitenavIndexRows,
  cachedSitenavList,
  navAreasFragment,
  navAreasFragmentWithLevel3,
  sitenavIndex,
  sitenavIndexWithLevel3,
  svgIcon,
} from '../mocks.js';

const CACHE_KEY = 'spectrum-hub:sitenav:public:v1';

const block = {
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  // getSiteNav() builds <div id="sitenav">, not .sitenav
  ariaRoot: '#sitenav',
  routes: [
    {
      url: '**/fragments/nav/site-nav.plain.html',
      contentType: 'text/html',
      body: navAreasFragment,
    },
    {
      // sitenav.js requests '/query-index.json?compact=true' — the trailing '*' is required
      // for Playwright's glob route matching to include the query string, otherwise this
      // mock silently never intercepts and the real network response is used instead.
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: sitenavIndex,
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
    },
  ],
};

// Four levels deep (Foundations > Layout and structure > Spacing > Scale) so a
// level-3-button (with its own chevron, per decorateLevel's depth === 2 || depth === 3
// rule) actually exists to expand — see mocks.js for why this needs its own fragment/index
// pair rather than reusing navAreasFragment/sitenavIndex.
const levelThreeBlock = {
  ...block,
  routes: [
    {
      url: '**/fragments/nav/site-nav.plain.html',
      contentType: 'text/html',
      body: navAreasFragmentWithLevel3,
    },
    {
      // sitenav.js requests '/query-index.json?compact=true' — the trailing '*' is required
      // for Playwright's glob route matching to include the query string, otherwise this
      // mock silently never intercepts and the real network response is used instead.
      url: '**/query-index.json*',
      contentType: 'application/json',
      body: sitenavIndexWithLevel3,
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
    },
  ],
};

const changedSitenavList = cachedSitenavList.replace(
  /<\/ul>$/,
  '  <li><p>Components</p><ul><li><a href="/components">Components</a></li></ul></li>\n</ul>',
);
const changedNavAreasFragment = `<body><header></header><main><div>${changedSitenavList}</div></main></body>`;
const changedSitenavIndex = JSON.stringify({
  data: [
    ...cachedSitenavIndexRows,
    { path: '/components', title: 'Components' },
  ],
});

async function seedPublicSitenavCache(
  page,
  filteredListHtml = cachedSitenavList,
  indexRows = cachedSitenavIndexRows,
) {
  await page.addInitScript(({ key, list, rows }) => {
    localStorage.removeItem(key);
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      filteredListHtml: list,
      indexRows: rows,
    }));
  }, {
    key: CACHE_KEY,
    list: filteredListHtml,
    rows: indexRows,
  });
}

async function delayFreshSitenav(page, {
  fragment = navAreasFragment,
  index = sitenavIndex,
} = {}) {
  let release;
  let startedCount = 0;
  let markStarted;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { markStarted = resolve; });
  const waitForRelease = async (route, response) => {
    startedCount += 1;
    if (startedCount === 2) { markStarted(); }
    await gate;
    await route.fulfill(response);
  };

  await page.route('**/fragments/nav/site-nav.plain.html', (route) => waitForRelease(route, {
    contentType: 'text/html',
    body: fragment,
  }));
  await page.route('**/query-index.json*', (route) => waitForRelease(route, {
    contentType: 'application/json',
    body: index,
  }));
  await page.route('**/*.svg', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: svgIcon,
  }));

  return {
    started,
    release,
  };
}

async function nextRenderedFrame(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function observeSitenavLayoutShifts(page) {
  await page.addInitScript(() => {
    window.sitenavLayoutShifts = [];
    const serializeRect = ({
      x, y, width, height, top, right, bottom, left,
    }) => ({
      x, y, width, height, top, right, bottom, left,
    });
    const identifyNode = (node) => {
      if (!(node instanceof Element)) {
        return null;
      }
      const describe = (element) => {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList].map((name) => `.${name}`).join('');
        return `${element.localName}${id}${classes}`;
      };
      const layoutRoot = node.closest('main#main-content, #sitenav');
      return layoutRoot && layoutRoot !== node
        ? `${describe(layoutRoot)} ${describe(node)}`
        : describe(node);
    };
    new PerformanceObserver((list) => {
      list.getEntries()
        .filter((entry) => !entry.hadRecentInput)
        .forEach((entry) => window.sitenavLayoutShifts.push({
          value: entry.value,
          sources: entry.sources.map((source) => ({
            node: identifyNode(source.node),
            previousRect: serializeRect(source.previousRect),
            currentRect: serializeRect(source.currentRect),
          })),
        }));
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

async function readRelevantLayoutShifts(page) {
  await nextRenderedFrame(page);
  return page.evaluate(() => window.sitenavLayoutShifts.filter(
    (entry) => entry.sources.some(({ node }) => node?.startsWith('main#main-content')
      || node?.startsWith('div#sitenav')),
  ));
}

async function captureLayoutBounds(page) {
  return {
    main: await page.locator('main').boundingBox(),
    sitenav: await page.locator('#sitenav').boundingBox(),
  };
}

function expectStableBounds(before, after) {
  expect(after.main.x).toBe(before.main.x);
  expect(after.main.y).toBe(before.main.y);
  expect(after.main.width).toBe(before.main.width);
  expect(after.sitenav.x).toBe(before.sitenav.x);
  expect(after.sitenav.y).toBe(before.sitenav.y);
  expect(after.sitenav.width).toBe(before.sitenav.width);
}

function expectStableMainBounds(before, after) {
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y);
  expect(after.width).toBe(before.width);
}

async function releaseFreshAndWait(page, delayed) {
  const responses = Promise.all([
    page.waitForResponse((response) => response.url().includes('/fragments/nav/site-nav.plain.html')),
    page.waitForResponse((response) => response.url().includes('/query-index.json?compact=true')),
  ]);
  delayed.release();
  await responses;
  await nextRenderedFrame(page);
}

// Below 900px the rail collapses behind a hamburger trigger (see sitenav.css) and only
// opens on click — on mobile projects, open it first so the scan covers the real
// collapsed/expanded mobile experience instead of waiting forever on a closed panel.
async function waitForNavReady(page, isMobile) {
  if (isMobile) {
    await page.waitForSelector('.sitenav-trigger-btn');
    await page.click('.sitenav-trigger-btn');
  }

  // getSiteNav() builds <div id="sitenav">, not .sitenav; decorateLevel adds
  // level-<depth>-list, not sitenav-list.
  await page.waitForSelector('#sitenav .level-1-list');
}

// Drills down to reveal the level-3 button without expanding it, so callers can assert
// its own collapsed -> expanded transition independently.
async function revealLevelThreeButton(page) {
  await page.getByRole('button', { name: 'Foundations', exact: true }).click();
  await page.getByRole('button', { name: 'Layout and structure', exact: true }).click();
}

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page, isMobile }, testInfo) => {
  // Unlike most blocks, sitenav's tree isn't viewport-agnostic: below 900px the rail
  // (nav, list items, expand button) is CSS-hidden (display: none) and only the
  // sitenav-trigger-btn is present, so desktop and mobile need their own snapshots
  // and both projects have to actually run instead of one standing in for the other.
  test.skip(testInfo.project.name !== 'chromium', 'covered separately by the mobile accessibility tree test below');
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  await expect(page.locator(block.ariaRoot)).toMatchAriaSnapshot(`
    - navigation "Spectrum Hub":
      - list:
        - listitem:
          - button "Getting started"
        - listitem:
          - button "Foundations"
      - button "Expand navigation":
        - img
  `);
});

test(`${block.name} block matches its expected accessibility tree on mobile`, async ({ page, isMobile }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Chrome', 'only Mobile Chrome renders the sitenav-trigger-btn tree being asserted here');
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  await expect(page.locator(block.ariaRoot)).toMatchAriaSnapshot(`
    - navigation "Spectrum Hub":
      - list:
        - listitem:
          - button "Getting started"
        - listitem:
          - button "Foundations"
      - button "Expand navigation":
        - img
    - button "Toggle site navigation" [expanded]:
      - img
  `);
});

test(`${block.name} level-2 menu remains visible until its collapse transition finishes`, async ({ page, isMobile }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'transition timing is covered once in desktop Chromium');
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const toggle = page.getByRole('button', { name: 'Foundations', exact: true });
  const menu = page.locator(`#${await toggle.getAttribute('aria-controls')}`);

  await toggle.click();
  await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).width)).toBe('264px');

  await toggle.click();
  const collapsing = await menu.evaluate((el) => {
    const transitions = [
      ...document.documentElement.getAnimations(),
      ...el.getAnimations(),
    ];
    transitions.forEach((transition) => {
      transition.pause();
      transition.currentTime = 150;
    });

    const styles = getComputedStyle(el);
    return {
      visibility: styles.visibility,
      width: Number.parseFloat(styles.width),
    };
  });
  expect(collapsing.visibility).toBe('visible');
  expect(collapsing.width).toBeGreaterThan(0);
  expect(collapsing.width).toBeLessThan(264);

  await menu.evaluate((el) => {
    [
      ...document.documentElement.getAnimations(),
      ...el.getAnimations(),
    ].forEach((transition) => transition.finish());
  });

  await expect.poll(() => menu.evaluate((el) => {
    const styles = getComputedStyle(el);
    return {
      paddingInlineStart: styles.paddingInlineStart,
      paddingInlineEnd: styles.paddingInlineEnd,
      visibility: styles.visibility,
      width: styles.width,
    };
  })).toEqual({
    paddingInlineStart: '0px',
    paddingInlineEnd: '0px',
    visibility: 'hidden',
    width: '0px',
  });
});

test(`${block.name} crossfades content without collapsing when switching level-2 menus`, async ({ page, isMobile }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'transition timing is covered once in desktop Chromium');
  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const firstToggle = page.getByRole('button', { name: 'Getting started', exact: true });
  const nextToggle = page.getByRole('button', { name: 'Foundations', exact: true });
  const firstMenu = page.locator(`#${await firstToggle.getAttribute('aria-controls')}`);
  const nextMenu = page.locator(`#${await nextToggle.getAttribute('aria-controls')}`);

  await firstToggle.click();
  await expect.poll(() => firstMenu.evaluate((el) => getComputedStyle(el).width)).toBe('264px');

  const expandedPadding = await firstMenu.evaluate((el) => getComputedStyle(el).paddingInlineStart);
  await nextToggle.click();

  const switching = await page.evaluate(({ firstMenuId, nextMenuId }) => {
    const first = document.getElementById(firstMenuId);
    const next = document.getElementById(nextMenuId);
    [...first.getAnimations({ subtree: true }), ...next.getAnimations({ subtree: true })]
      .forEach((transition) => {
        transition.pause();
        transition.currentTime = 80;
      });

    const firstStyles = getComputedStyle(first);
    const nextStyles = getComputedStyle(next);
    return {
      first: {
        backdropFilter: firstStyles.backdropFilter,
        backgroundColor: firstStyles.backgroundColor,
        backgroundImage: firstStyles.backgroundImage,
        boxShadow: firstStyles.boxShadow,
        inert: first.inert,
        opacity: Number.parseFloat(getComputedStyle(first.firstElementChild).opacity),
        paddingInlineStart: firstStyles.paddingInlineStart,
        pointerEvents: firstStyles.pointerEvents,
        width: firstStyles.width,
      },
      next: {
        inert: next.inert,
        opacity: Number.parseFloat(getComputedStyle(next.firstElementChild).opacity),
        paddingInlineStart: nextStyles.paddingInlineStart,
        pointerEvents: nextStyles.pointerEvents,
        width: nextStyles.width,
      },
    };
  }, {
    firstMenuId: await firstMenu.getAttribute('id'),
    nextMenuId: await nextMenu.getAttribute('id'),
  });

  expect(switching.first.width).toBe('264px');
  expect(switching.next.width).toBe('264px');
  expect(switching.first.paddingInlineStart).toBe(expandedPadding);
  expect(switching.next.paddingInlineStart).toBe(expandedPadding);
  expect(switching.first.inert).toBe(true);
  expect(switching.next.inert).toBe(false);
  expect(switching.first.pointerEvents).toBe('none');
  expect(switching.next.pointerEvents).toBe('auto');
  expect(switching.first.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(switching.first.backgroundImage).toBe('none');
  expect(switching.first.boxShadow).toBe('none');
  expect(switching.first.backdropFilter).toBe('none');
  expect(switching.first.opacity).toBeGreaterThan(0);
  expect(switching.first.opacity).toBeLessThan(1);
  expect(switching.next.opacity).toBeGreaterThan(0);
  expect(switching.next.opacity).toBeLessThan(1);

  await nextMenu.evaluate((el) => {
    [...el.parentElement.parentElement.getAnimations({ subtree: true })]
      .forEach((transition) => transition.finish());
  });

  await expect(firstMenu).not.toBeVisible();
  await expect(nextMenu).toBeVisible();
  await expect(nextToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nextMenu.locator('[tabindex="0"]')).toHaveCount(1);
});

test(`${block.name} block with a level-3 item expanded has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block toggles the level-3 button's own aria-expanded state and reveals its level-4 link`, async ({ page, isMobile }) => {
  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);

  const level3Btn = page.getByRole('button', { name: 'Spacing', exact: true });
  const level4Link = page.getByRole('link', { name: 'Scale', exact: true });

  await expect(level3Btn).toHaveAttribute('aria-expanded', 'false');
  await expect(level4Link).not.toBeVisible();

  await level3Btn.click();

  await expect(level3Btn).toHaveAttribute('aria-expanded', 'true');
  await expect(level4Link).toBeVisible();
});

test(`${block.name} block matches its expected accessibility tree with a level-3 item expanded`, async ({ page, isMobile }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();

  await expect(page.locator('#sitenav .level-3-button')).toMatchAriaSnapshot(`
    - button "Spacing" [expanded]:
      - img
  `);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, block);
  await waitForNavReady(page, isMobile);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} cached navigation is interactive while fresh navigation is pending`, async ({ page, isMobile }) => {
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page, {
    fragment: changedNavAreasFragment,
    index: changedSitenavIndex,
  });

  try {
    await page.goto(block.path);
    await delayed.started;
    await waitForNavReady(page, isMobile);

    const foundations = page.getByRole('button', { name: 'Foundations', exact: true });
    await foundations.click();
    await expect(foundations).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Foundations', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toHaveCount(0);

    await releaseFreshAndWait(page, delayed);

    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
    await expect(page.locator('#sitenav')).toHaveCount(1);
  } finally {
    delayed.release();
  }
});

test(`${block.name} replaces changed cached navigation atomically`, async ({ page }) => {
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page, {
    fragment: changedNavAreasFragment,
    index: changedSitenavIndex,
  });

  try {
    await page.goto(block.path);
    await delayed.started;
    await page.waitForSelector('#sitenav .level-1-list', { state: 'attached' });
    await page.evaluate(() => {
      window.sitenavReplacementRecords = [];
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          const addedSitenav = [...record.addedNodes].filter((node) => node.id === 'sitenav').length;
          const removedSitenav = [...record.removedNodes].filter((node) => node.id === 'sitenav').length;
          if (addedSitenav || removedSitenav) {
            window.sitenavReplacementRecords.push({
              addedSitenav,
              removedSitenav,
              navCount: document.querySelectorAll('#sitenav').length,
            });
          }
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    await releaseFreshAndWait(page, delayed);
    await expect(page.locator('.level-1-button', { hasText: 'Components' })).toHaveCount(1);

    expect(await page.evaluate(() => window.sitenavReplacementRecords)).toEqual([{
      addedSitenav: 1,
      removedSitenav: 1,
      navCount: 1,
    }]);
    await expect(page.locator('#sitenav')).toHaveCount(1);
  } finally {
    delayed.release();
  }
});

test(`${block.name} preserves rail, disclosure, and focus state across fresh replacement`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'the expanded rail is desktop-only');
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page, {
    fragment: changedNavAreasFragment,
    index: changedSitenavIndex,
  });

  try {
    await page.goto(block.path);
    await delayed.started;
    await page.waitForSelector('#sitenav .level-1-list', { state: 'attached' });

    await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    const disclosure = page.getByRole('button', { name: 'Foundations', exact: true });
    await disclosure.click();
    const survivingLink = page.getByRole('link', { name: 'Foundations', exact: true });
    await survivingLink.focus();
    await expect(survivingLink).toBeFocused();

    await releaseFreshAndWait(page, delayed);
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();

    await expect(page.locator('#sitenav')).toHaveAttribute('is-expanded', '');
    await expect(page.getByRole('button', { name: 'Foundations', exact: true }))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Foundations', exact: true })).toBeFocused();
  } finally {
    delayed.release();
  }
});

test(`${block.name} retains the cached DOM node when fresh navigation is unchanged`, async ({ page }) => {
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page);

  try {
    await page.goto(block.path);
    await delayed.started;
    await page.waitForSelector('#sitenav .level-1-list', { state: 'attached' });
    await page.evaluate(() => { window.originalSitenav = document.querySelector('#sitenav'); });

    await releaseFreshAndWait(page, delayed);

    expect(await page.evaluate(() => window.originalSitenav === document.querySelector('#sitenav'))).toBe(true);
    await expect(page.locator('#sitenav')).toHaveCount(1);
  } finally {
    delayed.release();
  }
});

test(`${block.name} cached path has no WCAG violations and matches its accessibility tree`, async ({
  page,
  makeAxeBuilder,
  isMobile,
}, testInfo) => {
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page);

  try {
    await page.goto(block.path);
    await delayed.started;
    await waitForNavReady(page, isMobile);

    const results = await makeAxeBuilder()
      .disableRules(block.disableRules ?? [])
      .analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);

    const expectedTree = testInfo.project.name === 'Mobile Chrome' ? `
      - navigation "Spectrum Hub":
        - list:
          - listitem:
            - button "Getting started"
          - listitem:
            - button "Foundations"
        - button "Expand navigation":
          - img
      - button "Toggle site navigation" [expanded]:
        - img
    ` : `
      - navigation "Spectrum Hub":
        - list:
          - listitem:
            - button "Getting started"
          - listitem:
            - button "Foundations"
        - button "Expand navigation":
          - img
    `;
    await expect(page.locator(block.ariaRoot)).toMatchAriaSnapshot(expectedTree);
  } finally {
    delayed.release();
  }
});

test(`${block.name} fresh replacement does not shift the desktop main layout`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop rail layout is covered in Chromium');
  await observeSitenavLayoutShifts(page);
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page, {
    fragment: changedNavAreasFragment,
    index: changedSitenavIndex,
  });

  try {
    const navigation = page.goto(`${block.path}?delay-sitenav`);
    await page.waitForSelector('main#main-content');
    await nextRenderedFrame(page);
    const initialMainBounds = await page.locator('main').boundingBox();
    await page.evaluate(() => {
      window.dispatchEvent(new Event('sitenav-fixture-release'));
    });
    await navigation;
    await delayed.started;
    await page.waitForSelector('#sitenav .level-1-list');
    await nextRenderedFrame(page);
    const cachedBounds = await captureLayoutBounds(page);
    expectStableMainBounds(initialMainBounds, cachedBounds.main);
    const cachedInsertionShifts = await readRelevantLayoutShifts(page);
    expect(
      cachedInsertionShifts,
      `cached insertion shifted the fixture layout:\n${JSON.stringify(cachedInsertionShifts, null, 2)}`,
    ).toEqual([]);
    await page.evaluate(() => { window.sitenavLayoutShifts = []; });

    await releaseFreshAndWait(page, delayed);
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
    const freshBounds = await captureLayoutBounds(page);
    expectStableBounds(cachedBounds, freshBounds);

    const replacementShifts = await readRelevantLayoutShifts(page);
    expect(
      replacementShifts,
      `fresh replacement shifted the cached layout:\n${JSON.stringify(replacementShifts, null, 2)}`,
    ).toEqual([]);
  } finally {
    delayed.release();
  }
});

test(`${block.name} mobile overlay does not reserve or move the main grid track`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Chrome', 'fixed overlay behavior is mobile-only');
  await observeSitenavLayoutShifts(page);
  await seedPublicSitenavCache(page);
  const delayed = await delayFreshSitenav(page, {
    fragment: changedNavAreasFragment,
    index: changedSitenavIndex,
  });

  try {
    await page.goto(block.path);
    await delayed.started;
    await page.waitForSelector('.sitenav-trigger-btn');
    const cachedBounds = await captureLayoutBounds(page);

    await page.getByRole('button', { name: 'Toggle site navigation', exact: true }).click();
    await expect(page.locator('#sitenav')).toHaveAttribute('is-open', '');
    const openBounds = await captureLayoutBounds(page);

    expect(openBounds.main.x).toBe(cachedBounds.main.x);
    expect(openBounds.main.y).toBe(cachedBounds.main.y);
    expect(openBounds.main.width).toBe(cachedBounds.main.width);

    await page.evaluate(() => { window.sitenavLayoutShifts = []; });
    await releaseFreshAndWait(page, delayed);
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
    const freshBounds = await captureLayoutBounds(page);

    expect(freshBounds.main.x).toBe(cachedBounds.main.x);
    expect(freshBounds.main.y).toBe(cachedBounds.main.y);
    expect(freshBounds.main.width).toBe(cachedBounds.main.width);

    const replacementShifts = await readRelevantLayoutShifts(page);
    expect(
      replacementShifts,
      `mobile fresh replacement shifted the main track:\n${JSON.stringify(replacementShifts, null, 2)}`,
    ).toEqual([]);
  } finally {
    delayed.release();
  }
});
