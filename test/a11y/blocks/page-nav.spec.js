import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'page-nav',
  path: '/test/a11y/fixtures/page-nav.html',
  readySelector: 'nav.page-nav',
};

test(`${block.name} clears the fixed header and avoids hidden desktop work`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'this test drives its own viewports');

  for (const width of [899, 1000, 1199, 1200]) {
    const requests = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${block.path}#accessibility`);
    await page.waitForSelector('#accessibility.page-nav-target');
    await page.waitForFunction(
      (desktop) => Boolean(document.querySelector('nav.page-nav')) === desktop,
      width >= 1200,
    );
    await page.waitForLoadState('networkidle');

    const measurements = await page.evaluate(() => {
      const target = document.querySelector('#accessibility');
      const header = document.querySelector('.fixture-header');
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      return {
        activeElementId: document.activeElement.id,
        headerBottom: header.getBoundingClientRect().bottom,
        navPresent: Boolean(document.querySelector('nav.page-nav')),
        scrollMargin: Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart),
        targetTop: target.getBoundingClientRect().top,
        pageNavTrackWidth: Number.parseFloat(
          getComputedStyle(document.body).getPropertyValue('--pagenav-track-width'),
        ),
      };
    });

    expect(measurements.scrollMargin).toBeGreaterThan(0);
    expect(measurements.targetTop).toBeGreaterThanOrEqual(measurements.headerBottom - 1);
    expect(measurements.activeElementId).toBe('accessibility');
    expect(measurements.navPresent, `Page Nav presence at ${width}px`).toBe(width >= 1200);
    if (width < 1200) {
      const expectedTrack = width < 900 ? 0 : 24;
      expect(measurements.pageNavTrackWidth).toBe(expectedTrack);
      const desktopOnlyModules = [
        '/scripts/utils/svg.js',
        '/scripts/utils/copy-md.js',
        '/scripts/utils/go-to-impl.js',
        '/scripts/utils/figma.js',
      ];
      expect(requests.some((pathname) => desktopOnlyModules.includes(pathname))).toBe(false);
    }
  }

  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto(block.path);
  const statusTableTrack = await page.evaluate(() => {
    const meta = document.createElement('meta');
    meta.name = 'template';
    meta.content = 'status-table';
    document.head.append(meta);
    return Number.parseFloat(
      getComputedStyle(document.body).getPropertyValue('--pagenav-track-width'),
    );
  });
  expect(statusTableTrack).toBe(24);
});

// Below 1200px, page-nav.js removes the nav from the DOM entirely — there's nothing to
// scan on mobile viewports, and that removal behavior is already covered by
// test/blocks/page-nav.test.js ("the nav is removed from the DOM below the desktop breakpoint").
test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder, isMobile }) => {
  test.skip(isMobile, 'page-nav is fully removed below 1200px by design — see test/blocks/page-nav.test.js');

  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice. This also
  // means we never hit the below-1200px removal case, so no isMobile skip is needed here.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - navigation "On this page":
      - list:
        - listitem:
          - link "Usage guidelines":
            - /url: "#usage-guidelines"
        - listitem:
          - link "Accessibility":
            - /url: "#accessibility"
        - listitem:
          - link "API reference":
            - /url: "#api-reference"
      - button "Copy markdown":
        - img
        - text: ""
  `);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'page-nav is fully removed below 1200px by design — see test/blocks/page-nav.test.js');

  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, block);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
