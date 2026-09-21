import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { formatViolations } from '../block-a11y.js';
import { gotoFixture } from '../../playwright/fixture.js';
import {
  navAreasFragment, sitenavIndex, navAreasFragmentWithLevel3, sitenavIndexWithLevel3,
} from '../mocks.js';

const block = {
  name: 'sitenav',
  path: '/test/a11y/fixtures/sitenav.html',
  // getSiteNav() builds <div id="sitenav">, not .sitenav
  ariaRoot: '#sitenav',
  routes: [
    {
      url: '**/fragments/nav/site-nav',
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
      url: '**/fragments/nav/site-nav',
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
  ],
};

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
  await gotoFixture(page, block);
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
  await gotoFixture(page, block);
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
  await gotoFixture(page, block);
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
  await gotoFixture(page, block);
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
  await gotoFixture(page, levelThreeBlock);
  await waitForNavReady(page, isMobile);
  await revealLevelThreeButton(page);
  await page.getByRole('button', { name: 'Spacing', exact: true }).click();

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block toggles the level-3 button's own aria-expanded state and reveals its level-4 link`, async ({ page, isMobile }) => {
  await gotoFixture(page, levelThreeBlock);
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

  await gotoFixture(page, levelThreeBlock);
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

  await gotoFixture(page, block);
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
