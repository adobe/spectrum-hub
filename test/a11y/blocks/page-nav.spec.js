import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'page-nav',
  path: '/test/a11y/fixtures/page-nav.html',
  readySelector: 'nav.page-nav',
};

for (const colorScheme of ['light', 'dark']) {
  test(`${block.name} authored actions in ${colorScheme} mode are accessible`, async ({ page, makeAxeBuilder, isMobile }) => {
    test.skip(isMobile, 'page-nav is absent below the desktop breakpoint');
    await page.emulateMedia({ colorScheme });
    const statusRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/deps/status/')) { statusRequests.push(request.url()); }
    });
    await gotoBlock(page, {
      path: '/test/a11y/fixtures/component-status.html?authored&nav',
      readySelector: 'nav.page-nav .page-nav-widgets',
    });

    const nav = page.getByRole('navigation', { name: 'Page actions' });
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText('Android code available');
    await expect(links.nth(1)).toHaveText('iOS design available');
    await expect(nav.getByText('iOS code not available')).toHaveCount(0);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    const focusOrder = [
      ...await page.locator('.component-status a').all(),
      nav.getByRole('button', { name: 'Copy markdown' }),
      ...await links.all(),
    ];
    for (const target of focusOrder) {
      await page.keyboard.press('Tab');
      await expect(target).toBeFocused();
    }
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    expect(statusRequests).toHaveLength(0);
  });
}

test(`${block.name} authored actions match their expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Page actions tree only needs the desktop project');
  await gotoBlock(page, {
    path: '/test/a11y/fixtures/component-status.html?authored&nav&nav-first',
    readySelector: 'nav.page-nav .page-nav-widgets',
  });

  await expect(page.getByRole('navigation', { name: 'Page actions' })).toMatchAriaSnapshot(`
    - navigation "Page actions":
      - button "Copy markdown":
        - img
        - text: Copy markdown
      - link "Android code available. Opens Android Switch documentation in a new tab.":
        - /url: https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.switch/-spectrum-switch.html
        - img
        - text: Android code available
      - link "iOS design available. Opens iOS Switch design in a new tab.":
        - /url: https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=11371-7857&m=dev
        - img
        - text: iOS design available
  `);
});

test(`${block.name} heading-free pattern page has accessible actions`, async ({ page, makeAxeBuilder }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Page actions tree only needs the desktop project');

  await gotoBlock(page, {
    path: `${block.path}?pattern`,
    readySelector: 'nav.page-nav .page-nav-widgets',
    routes: [{
      url: '**/deps/status/response-status.json',
      contentType: 'application/json',
      body: JSON.stringify({
        web: {
          figma: {
            status: 'available',
            figmaSource: 'ai-toolkit',
            figmaFile: '3WdX799d7ptEVA6RuTESXs',
            figmaPageId: '1:2',
          },
        },
      }),
    }],
  });

  const nav = page.getByRole('navigation', { name: 'Page actions' });
  await expect(nav.getByRole('list')).toHaveCount(0);
  await expect(nav).toMatchAriaSnapshot(`
    - navigation "Page actions":
      - button "Copy markdown":
        - img
        - text: Copy markdown
      - link "Go to SWC. Opens response-status in a new tab.":
        - /url: https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-response-status--docs
        - img
        - text: Go to SWC
      - link "See in Figma. Opens response-status in a new tab.":
        - /url: https://www.figma.com/design/3WdX799d7ptEVA6RuTESXs/Spectrum-AI-Toolkit?node-id=1-2&m=dev
        - img
        - text: See in Figma
  `);
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

[
  {
    description: 'linked',
    rows: '<div><div>Code deprecated</div><div><a href="/legacy">Legacy code</a></div></div>',
    cdnEnv: false,
  },
  {
    description: 'invalid',
    rows: '<div><div>Code ready</div><div></div></div>',
    cdnEnv: false,
  },
  {
    description: 'audience-hidden',
    rows: '<div><div>Design available</div><div><a href="/private-design">Design</a></div></div>',
    cdnEnv: true,
  },
].forEach(({ description, rows, cdnEnv }) => {
  test(`${block.name} reconciles a later-section ${description} component-status fragment without losing keyboard focus`, async ({ page, makeAxeBuilder }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'page-nav is desktop-only');
    let releaseFragment;
    const fragmentReady = new Promise((resolve) => { releaseFragment = resolve; });
    const path = '/web/swc/patterns/ai-toolkit/response-status';
    await page.route(`**${path}`, (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
      <html lang="en" class="spectrum-edge">
        <head>
          <title>Late authored status</title>
          <meta name="template" content="component">
          <meta name="sitenav" content="off">
          <link rel="stylesheet" href="/styles/styles.css">
        </head>
        <body>
          <main>
            <div><div class="page-hero"><h1>Response status</h1></div></div>
            <div><p><a href="/fragments/late-status">Authored status</a></p></div>
          </main>
          <script type="module">
            import { setConfig, loadArea } from '/scripts/ak.js';
            window.statusErrors = [];
            setConfig({
              components: ['fragment'], hostnames: [], cdnEnv: ${cdnEnv},
              linkBlocks: [{ fragment: '/fragments/' }],
              log: (error) => window.statusErrors.push(error.message),
            });
            window.areaReady = loadArea();
          </script>
        </body>
      </html>`,
    }));
    await page.route('**/scripts/lazy.js', (route) => route.fulfill({
      contentType: 'text/javascript', body: 'export {};',
    }));
    await page.route('**/deps/status/response-status.json', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        web: {
          swc: { status: 'available' },
          figma: {
            status: 'available',
            figmaSource: 'ai-toolkit',
            figmaFile: '3WdX799d7ptEVA6RuTESXs',
            figmaPageId: '1:2',
          },
        },
      }),
    }));
    await page.route('**/fragments/late-status', async (route) => {
      await fragmentReady;
      await route.fulfill({
        contentType: 'text/html',
        body: `<main><div><div class="component-status">${rows}</div></div></main>`,
      });
    });

    try {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: 'Page actions' });
      await expect(nav.getByRole('link')).toHaveCount(cdnEnv ? 1 : 2);
      await expect(page.locator('.page-hero .component-status-pill')).toHaveCount(cdnEnv ? 1 : 2);
      const copy = nav.getByRole('button', { name: 'Copy markdown' });
      await copy.focus();

      releaseFragment();
      await page.evaluate(() => window.areaReady);

      await expect(page.locator('.page-hero .component-status')).toHaveCount(0);
      await expect(copy).toBeFocused();
      if (description === 'linked') {
        await expect(nav.getByRole('link')).toHaveText('Code deprecated');
        await expect(page.locator('.component-status-pill')).toHaveCount(1);
        await page.keyboard.press('Tab');
        await expect(nav.getByRole('link')).toBeFocused();
        await expect(nav).toMatchAriaSnapshot(`
      - navigation "Page actions":
        - button "Copy markdown":
          - img
          - text: Copy markdown
        - link "Code deprecated. Opens Legacy code in a new tab.":
          - /url: http://localhost:3001/legacy
          - img
          - text: Code deprecated
    `);
      } else {
        await expect(nav.getByRole('link')).toHaveCount(0);
        const status = page.locator('main .component-status');
        await expect(status).toHaveCount(1);
        await expect(status).toBeEmpty();
        await expect(status).toBeHidden();
        await expect(nav).toMatchAriaSnapshot(`
        - navigation "Page actions":
          - button "Copy markdown":
            - img
            - text: Copy markdown
      `);
      }
      expect(await page.evaluate(() => window.statusErrors)).toEqual(description === 'invalid'
        ? ['Invalid component-status row 1: expected one Code/Design kind, one status, and an optional HTTP(S) link.']
        : []);
      const results = await makeAxeBuilder().analyze();
      expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    } finally {
      releaseFragment();
    }
  });
});

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
        '/scripts/utils/authored-status.js',
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
