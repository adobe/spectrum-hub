import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { statusSlice } from '../mocks.js';
import { FIGMA_SOURCES } from '../../../scripts/utils/figma-sources.js';

const block = {
  name: 'component-status',
  path: '/test/a11y/fixtures/component-status.html',
  readySelector: '.component-status-pill',
  routes: [
    {
      url: '**/deps/status/button.json',
      contentType: 'application/json',
      body: statusSlice,
    },
  ],
};

for (const colorScheme of ['light', 'dark']) {
  test(`${block.name} authored text-only pills keep automatic padding in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await gotoBlock(page, block);
    const automaticPadding = await page.locator('.component-status-pill').first()
      .evaluate((element) => getComputedStyle(element).paddingInline);

    await gotoBlock(page, { ...block, path: `${block.path}?authored`, routes: [] });

    const pills = page.locator('.component-status-pill:not(:has(a))');
    await expect(pills).toHaveCount(2);
    for (const pill of await pills.all()) {
      await expect(pill).toHaveCSS('padding-inline', automaticPadding);
    }
  });

  test(`${block.name} authored hero links match automatic pill styles and clickable bounds in ${colorScheme} mode`, async ({ page, makeAxeBuilder }) => {
    await page.emulateMedia({ colorScheme });
    const properties = [
      'display', 'align-items', 'gap', 'padding-inline-start', 'padding-inline-end',
      'height', 'border-radius', 'background-color', 'color', 'font-size',
      'font-weight', 'line-height', 'text-decoration-line', 'border-width',
    ];
    const styles = (element, names) => Object.fromEntries(
      names.map((name) => [name, getComputedStyle(element).getPropertyValue(name)]),
    );
    await gotoBlock(page, block);
    const automatic = page.locator('a.component-status-pill').first();
    const automaticStyles = await automatic.evaluate(styles, properties);
    await page.keyboard.press('Tab');
    await expect(automatic).toBeFocused();
    const focusProperties = ['outline-style', 'outline-width', 'outline-color', 'outline-offset'];
    const automaticFocus = await automatic.evaluate(styles, focusProperties);
    await automatic.hover();
    await automatic.evaluate((element) => Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    ));
    const automaticHover = await automatic.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    await gotoBlock(page, { ...block, path: `${block.path}?authored&hero`, routes: [] });
    await page.mouse.move(0, 0);
    const links = page.locator('.component-status a');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      expect(await link.evaluate(styles, properties)).toEqual(automaticStyles);
      const bounds = await link.evaluate((element) => {
        const pill = element.closest('.component-status-pill');
        const outer = pill.getBoundingClientRect();
        const inner = element.getBoundingClientRect();
        return {
          pill: { x: outer.x, y: outer.y, width: outer.width, height: outer.height },
          link: { x: inner.x, y: inner.y, width: inner.width, height: inner.height },
          paddingIsClickable: [outer.left + 2, outer.right - 2].every((x) => (
            document.elementFromPoint(x, outer.y + outer.height / 2)?.closest('a') === element
          )),
        };
      });
      expect(bounds.link).toEqual(bounds.pill);
      expect(bounds.paddingIsClickable).toBe(true);
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      expect(await link.evaluate(styles, focusProperties)).toEqual(automaticFocus);
      await link.hover();
      await expect(link).toHaveCSS('background-color', automaticHover);
      await page.mouse.move(0, 0);
    }
    await expect(page.locator('.page-hero .component-status a')).toHaveCount(2);
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test(`${block.name} authored rows in ${colorScheme} mode have no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
    await page.emulateMedia({ colorScheme });
    const statusRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/deps/status/')) { statusRequests.push(request.url()); }
    });
    await gotoBlock(page, {
      ...block, path: `${block.path}?authored`, routes: [],
    });

    await expect(page.locator('.component-status-pill:not([data-kind="authored"][data-status="authored"])')).toHaveCount(0);
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    expect(statusRequests).toHaveLength(0);
    await expect(page.locator('.component-status-pill')).toHaveCount(4);
    const links = page.locator('.component-status a');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).not.toHaveAttribute('target');
      await expect(link).not.toHaveAttribute('aria-label');
    }
    await page.keyboard.press('Tab');
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
  });
}

test(`${block.name} authored rows match their expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic');
  await gotoBlock(page, { ...block, path: `${block.path}?authored`, routes: [] });

  await expect(page.locator('.component-status')).toMatchAriaSnapshot(`
    - group "Component status":
      - paragraph:
        - 'link "iOS Figma: Menu"':
          - /url: https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=2595-2573
      - 'link "iOS GitHub repo: Menu"':
        - /url: https://github.com/OneAdobe/spectrum-ios/tree/main/Sources/SpectrumComponents/Menu
      - text: Android Code not available Android Design Not available
  `);
});

test(`${block.name} audience-hidden authored rows do not trigger automatic hero replacement`, async ({ page }) => {
  await gotoBlock(page, { ...block, path: `${block.path}?authored` });
  await page.evaluate(async () => {
    const [{ setConfig, decorateAudience }, { default: initStatus }] = await Promise.all([
      import(new URL('/scripts/ak.js', location.origin).href),
      import(new URL('/blocks/component-status/component-status.js', location.origin).href),
    ]);
    setConfig({ components: [], cdnEnv: true });
    const main = document.createElement('main');
    main.innerHTML = `
      <div class="section">
        <div class="page-hero"><h1>Switch</h1></div>
        <div class="component-status audience-private">
          <div><div>Design available</div></div>
        </div>
      </div>
    `;
    document.querySelector('main').replaceWith(main);
    const meta = document.createElement('meta');
    meta.name = 'template';
    meta.content = 'component';
    document.head.append(meta);
    history.pushState({}, '', '/web/swc/components/button');
    await initStatus(document.querySelector('.component-status'));
    await decorateAudience(document);
    const { default: initHero } = await import(new URL('/blocks/page-hero/page-hero.js', location.origin).href);
    initHero(document.querySelector('.page-hero'));
  });

  await expect(page.locator('.page-hero .description')).toHaveCount(1);
  await expect(page.locator('.page-hero .component-status')).toHaveCount(0);
  await expect(page.locator('.component-status')).toHaveCount(0);
});

test(`${block.name} shared mobile page exposes separate accessible native Design links`, async ({ page, makeAxeBuilder }, testInfo) => {
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?platform=mobile&component=buttons`,
    routes: [{
      url: '**/deps/status/button.json',
      contentType: 'application/json',
      body: JSON.stringify({
        ios: {
          figma: {
            status: 'available',
            figmaSource: 's2-ios',
            figmaFile: 'OQExiy8bX0pRqee71eAWX6',
            figmaPageId: '3956:67276',
          },
        },
        android: {
          figma: {
            status: 'available',
            figmaSource: 's2-android',
            figmaFile: 'Yzbd4jgLTo6KhEPZKwv1WA',
            figmaPageId: '2002:3805',
          },
        },
      }),
    }],
  });
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  await expect(page.locator('[data-kind="dev"]')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /^iOS Design available/ })).toHaveAttribute('href', 'https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=3956-67276&m=dev');
  await expect(page.getByRole('link', { name: /^Android Design available/ })).toHaveAttribute('href', 'https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android?node-id=2002-3805&m=dev');
  if (testInfo.project.name === 'chromium') {
    await expect(page.locator('.component-status')).toMatchAriaSnapshot(`
      - group "Component status":
        - link "iOS Code available. Opens iOS documentation in a new tab.":
          - /url: https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/button
          - text: ""
        - link "Android Code available. Opens Android documentation in a new tab.":
          - /url: https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.button/-spectrum-button.html
          - text: ""
        - link "iOS Design available. Opens iOS Figma in a new tab.":
          - /url: https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=3956-67276&m=dev
          - text: ""
        - link "Android Design available. Opens Android Figma in a new tab.":
          - /url: https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android?node-id=2002-3805&m=dev
          - text: ""
    `);
  }
});

test(`${block.name} shared mobile page shows unavailable Code without a corresponding page-nav action`, async ({ page, makeAxeBuilder }, testInfo) => {
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?platform=mobile&component=switches`,
    routes: [{
      url: '**/deps/status/switch.json',
      contentType: 'application/json',
      body: JSON.stringify({
        android: {
          figma: {
            status: 'available',
            figmaSource: 's2-android',
            figmaFile: 'Yzbd4jgLTo6KhEPZKwv1WA',
            figmaPageId: '3984:38444',
          },
        },
      }),
    }],
  });
  await expect(page.getByText('iOS Code not available', { exact: true })).toBeVisible();
  await expect(page.getByText('iOS Design not available')).toBeVisible();
  await expect(page.getByRole('link', { name: /^iOS Code/ })).toHaveCount(0);
  await expect(page.locator('.component-status a')).toHaveCount(2);
  if (testInfo.project.name === 'chromium') {
    await page.evaluate(async () => {
      const heading = document.createElement('h1');
      heading.textContent = 'Switch';
      document.querySelector('main').prepend(heading);
      await import(new URL('/blocks/page-nav/page-nav.js', location.origin).href);
    });
    const nav = page.getByRole('navigation', { name: 'Page actions' });
    await expect(nav.getByRole('link', { name: /^Go to / })).toHaveText('Go to Android');
    await expect(nav.getByRole('button', { name: 'Copy markdown' })).toBeVisible();
  }
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  if (testInfo.project.name === 'chromium') {
    await expect(page.locator('.component-status')).toMatchAriaSnapshot(`
      - group "Component status":
        - text: iOS Code not available
        - link "Android Code available. Opens Android documentation in a new tab.":
          - /url: https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.switch/-spectrum-switch.html
          - text: ""
        - text: iOS Design not available
        - link "Android Design available. Opens Android Figma in a new tab.":
          - /url: https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android?node-id=3984-38444&m=dev
          - text: ""
    `);
  }
});

for (const source of FIGMA_SOURCES.filter(({ platform }) => platform !== 'web')) {
  test(`${block.name} ${source.platform} page exposes its accessible documentation and Design links`, async ({ page, makeAxeBuilder }, testInfo) => {
    await gotoBlock(page, {
      ...block,
      path: `${block.path}?platform=${source.platform}`,
      routes: [{
        url: '**/deps/status/button.json',
        contentType: 'application/json',
        body: JSON.stringify({
          [source.platform]: {
            figma: {
              status: 'available', figmaSource: source.id, figmaFile: source.fileKey, figmaPageId: '1:2',
            },
          },
        }),
      }],
    });
    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
    await expect(page.locator('[data-kind="dev"]')).toHaveCount(1);
    if (testInfo.project.name === 'chromium') {
      const label = source.platform === 'ios' ? 'iOS' : 'Android';
      const docs = source.platform === 'ios'
        ? 'https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/button'
        : 'https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.button/-spectrum-button.html';
      await expect(page.locator('.component-status')).toMatchAriaSnapshot(`
        - group "Component status":
          - link "${label} Code available. Opens ${label} documentation in a new tab.":
            - /url: ${docs}
            - text: ""
          - link "Design available. Opens Figma in a new tab.":
            - /url: https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=1-2&m=dev
            - text: ""
      `);
    }
  });
}

test(`${block.name} AI page exposes the published SWC pattern documentation link`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, {
    ...block,
    path: `${block.path}?component=message-sources`,
    routes: [{
      url: '**/deps/status/message-sources.json',
      contentType: 'application/json',
      body: JSON.stringify({
        web: {
          swc: { status: 'available' },
          figma: { status: 'not-available' },
        },
      }),
    }],
  });
  await expect(page.getByRole('link', { name: 'Code available. Opens SWC documentation in a new tab.' })).toHaveAttribute('href', 'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-message-sources--docs');
  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const results = await makeAxeBuilder()
    .disableRules(block.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  // Mobile Chrome also runs on the Chromium engine, so `browserName` alone can't isolate a
  // single run — check the project by name to actually run this once, not twice.
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - group "Component status":
      - link "Code available. Opens SWC documentation in a new tab.":
        - /url: https://spectrum-web-components.adobe.com/?path=/docs/components-button--docs
        - text: ""
      - link "Design experimental. Opens Figma in a new tab.":
        - /url: https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev
        - text: ""
  `);
});

test(`${block.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
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
