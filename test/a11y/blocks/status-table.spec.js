import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import { statusIndex, statusQueryIndex, svgIcon } from '../mocks.js';

const block = {
  name: 'status-table',
  path: '/test/a11y/fixtures/status-table.html',
  readySelector: '.status-table-table',
  routes: [
    {
      url: '**/deps/status-index.json',
      contentType: 'application/json',
      body: statusIndex,
    },
    {
      url: '**/query-index.json',
      contentType: 'application/json',
      body: statusQueryIndex,
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
    },
  ],
};

const webIndex = JSON.parse(statusIndex);
const mobileBlock = {
  ...block,
  path: `${block.path}?platform=mobile`,
  routes: [
    {
      url: '**/deps/status-index.json',
      contentType: 'application/json',
      body: JSON.stringify({
        implementations: {
          ...webIndex.implementations,
          mobile: [{ id: 'ios', label: 'iOS' }, { id: 'android', label: 'Android' }],
        },
        components: [
          ...webIndex.components,
          {
            name: 'Snackbar',
            label: 'Snackbar',
            platforms: {
              mobile: { ios: { status: 'experimental' }, android: { status: 'not-available' } },
            },
          },
          {
            name: 'ButtonPart',
            label: 'Button Part',
            listed: false,
            platforms: {
              mobile: { ios: { status: 'deprecated' }, android: { status: 'not-available' } },
            },
          },
        ].map((component) => (component.name === 'Button' ? {
          ...component,
          platforms: {
            ...component.platforms,
            mobile: { ios: { status: 'available' }, android: { status: 'not-available' } },
          },
        } : component)),
      }),
    },
    {
      url: '**/query-index.json',
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { path: '/mobile/components/button', title: 'Button' },
          { path: '/mobile/components/snackbar', title: 'Snackbar' },
        ],
      }),
    },
    {
      url: '**/*.svg',
      contentType: 'image/svg+xml',
      body: svgIcon,
    },
  ],
};

test('status-table mobile platform exposes its columns and shared-page links in the accessibility tree', async ({ page }) => {
  await gotoBlock(page, mobileBlock);

  await expect(page.getByRole('columnheader')).toHaveText(['Component', 'iOS', 'Android']);
  await expect(page.locator('.status-table-card')).toHaveCount(3);
  await expect(page.locator('.status-table-table tbody')).toMatchAriaSnapshot(`
    - rowgroup:
      - row "Button Button, Available in iOS Not available":
        - rowheader "Button"
        - cell "Button, Available in iOS":
          - link "Button, Available in iOS":
            - /url: /mobile/components/button
            - text: Available
        - cell "Not available"
      - row "Snackbar Snackbar, Experimental in iOS Not available":
        - rowheader "Snackbar"
        - cell "Snackbar, Experimental in iOS":
          - link "Snackbar, Experimental in iOS":
            - /url: /mobile/components/snackbar
            - text: Experimental
        - cell "Not available"
  `);
});

test('status-table mobile platform in light/default mode has no WCAG 2.2 AA violations', async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, mobileBlock);

  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('status-table mobile platform in dark mode has no color-contrast violations', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoBlock(page, mobileBlock);

  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
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
  // Unlike most blocks, this tree isn't viewport-agnostic: below 900px the stacked layout
  // clips the thead out of view and syncHeaderAccessibility() marks every sort-header
  // button aria-hidden, so the columnheaders lose their nested buttons. Desktop and
  // mobile need their own snapshots, and both projects have to actually run.
  test.skip(testInfo.project.name !== 'chromium', 'covered separately by the mobile accessibility tree test below');

  await gotoBlock(page, block);

  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - region "Component availability":
      - list:
        - listitem: Available Ready for use. Fidelity may vary.
        - listitem: Experimental Available for exploration and testing, but not recommended for production use.
        - listitem: Not available Not currently available or applicable for this implementation or design library.
      - button "Search components"
      - paragraph: Type to filter components.
      - button "Download CSV"
      - table "Component availability":
        - rowgroup:
          - row "Component Figma Spectrum Web Components":
            - columnheader "Component":
              - button "Component"
            - columnheader "Figma":
              - button "Figma"
            - columnheader "Spectrum Web Components":
              - button "Spectrum Web Components"
        - rowgroup:
          - row "Button Available Button, Available in Spectrum Web Components":
            - rowheader "Button"
            - cell "Available"
            - cell "Button, Available in Spectrum Web Components":
              - link "Button, Available in Spectrum Web Components":
                - /url: /web/swc/components/button
                - text: Available
          - row "Calendar Not available Calendar, Experimental in Spectrum Web Components":
            - rowheader "Calendar"
            - cell "Not available"
            - cell "Calendar, Experimental in Spectrum Web Components":
              - link "Calendar, Experimental in Spectrum Web Components":
                - /url: /web/swc/components/calendar
                - text: Experimental
      - status: Sorted by Component, ascending
  `);
});

test(`${block.name} block matches its expected accessibility tree on mobile`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Chrome', 'only Mobile Chrome renders the stacked layout tree being asserted here');

  await gotoBlock(page, block);

  // The stacked layout repeats each column header inside its cell as a visible
  // .status-table-cell-label. Those are aria-hidden, so they must NOT show up here —
  // the clipped `th[scope=col]` is what still names each cell for assistive tech.
  await expect(page.locator(block.ariaRoot ?? `.${block.name}`)).toMatchAriaSnapshot(`
    - region "Component availability":
      - list:
        - listitem: Available Ready for use. Fidelity may vary.
        - listitem: Experimental Available for exploration and testing, but not recommended for production use.
        - listitem: Not available Not currently available or applicable for this implementation or design library.
      - button "Search components"
      - paragraph: Type to filter components.
      - button "Download CSV"
      - table "Component availability":
        - rowgroup:
          - row "Component Figma Spectrum Web Components":
            - columnheader "Component"
            - columnheader "Figma"
            - columnheader "Spectrum Web Components"
        - rowgroup:
          - row "Button Available Button, Available in Spectrum Web Components":
            - rowheader "Button"
            - cell "Available"
            - cell "Button, Available in Spectrum Web Components":
              - link "Button, Available in Spectrum Web Components":
                - /url: /web/swc/components/button
                - text: Available
          - row "Calendar Not available Calendar, Experimental in Spectrum Web Components":
            - rowheader "Calendar"
            - cell "Not available"
            - cell "Calendar, Experimental in Spectrum Web Components":
              - link "Calendar, Experimental in Spectrum Web Components":
                - /url: /web/swc/components/calendar
                - text: Experimental
      - status: Sorted by Component, ascending
  `);
});

test(`${block.name} search exposes instructions and filtered-table feedback`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'the search accessibility tree is viewport-agnostic; one project run is enough');

  await gotoBlock(page, block);

  await page.getByRole('button', { name: 'Search components' }).click();
  const search = page.getByRole('searchbox', { name: 'Search components' });
  await expect(search).toMatchAriaSnapshot(`
    - searchbox "Search components":
      - /placeholder: Search components…
      - /description: Type to filter components.
  `);

  await search.fill('calendar');
  const status = page.getByRole('status');
  await expect(status).toHaveText('Table filtered to 1 component.');
  await expect(status).toMatchAriaSnapshot(`
    - status: Table filtered to 1 component.
  `);
});

test(`${block.name} sort headers are exposed exactly when the thead is on screen`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'this test drives its own viewports; one project run is enough');

  await gotoBlock(page, block);

  // 800px is the case a 900px viewport media query got wrong: the container query has
  // already restored the thead at 650px, so the headers are visible and clickable —
  // they must be reachable by keyboard and AT too (WCAG 2.1.1, 4.1.2).
  for (const { width, exposed } of [
    { width: 375, exposed: false },
    { width: 800, exposed: true },
    { width: 1200, exposed: true },
  ]) {
    await page.setViewportSize({ width, height: 800 });

    const buttons = page.locator('.status-table-sort-header');
    const count = await buttons.count();
    expect(count, 'expected sortable column headers').toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      await expect(buttons.nth(i), `aria-hidden at ${width}px`).toHaveAttribute('aria-hidden', String(!exposed));
      await expect(buttons.nth(i), `tabindex at ${width}px`).toHaveAttribute('tabindex', exposed ? '0' : '-1');
    }
  }

  // The headers aren't just labelled reachable — keyboard activation actually sorts.
  await page.setViewportSize({ width: 800, height: 800 });
  const componentHeader = page.locator('.status-table-sort-header').first();
  await componentHeader.focus();
  await expect(componentHeader).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.status-table-table thead th').first()).toHaveAttribute('aria-sort', 'descending');
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
