import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';

const block = {
  name: 'tabs',
  path: '/test/a11y/fixtures/tabs.html',
  readySelector: '.tabs[data-ready="true"]',
};

test(`${block.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);

  const results = await makeAxeBuilder().analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${block.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');
  await gotoBlock(page, block);

  await expect(page.locator('.tabs')).toMatchAriaSnapshot(`
    - tablist "Component information":
      - tab "Overview" [selected]
      - tab "Details"
    - tabpanel "Overview":
      - heading "Overview" [level=2]
      - paragraph: An introduction to the component.
      - heading "Anatomy" [level=2]
      - paragraph: The parts that make up the component.
  `);
});

test(`${block.name} block in dark mode has no color-contrast violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoBlock(page, block);

  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test('boundary metadata groups multiple sections and leaves later content outside tabs', async ({ page }) => {
  await gotoBlock(page, block);
  const panels = page.locator('swc-tab-panel');

  await expect(panels).toHaveCount(2);
  await expect(panels.nth(0).locator(':scope > .section')).toHaveCount(2);
  await expect(panels.nth(1).locator(':scope > .section')).toHaveCount(2);
  await expect(panels.nth(0).locator('.tabs-start')).toHaveClass(/container/);
  await expect(panels.nth(1).locator('.tabs-end #details')).toHaveCount(1);
  await expect(page.locator('main > .section #related')).toBeVisible();
  await expect(page.locator('.section-metadata, .section[data-status]')).toHaveCount(0);
});

test('tabs support native keyboard activation and keep inactive panel content unfocusable', async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, block);
  const first = page.getByRole('tab', { name: 'Overview', exact: true });
  const second = page.getByRole('tab', { name: 'Details', exact: true });
  await first.focus();
  await first.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await second.press('Enter');

  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Details', exact: true })).toBeVisible();
  await expect(page.locator('#overview')).toBeHidden();
  await expect(page.locator('#anatomy')).toBeHidden();
  await expect(page.locator('#implementation')).toBeVisible();
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.locator('#related')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to introduction' })).toBeVisible();
  await second.press('Home');
  await expect(first).toBeFocused();
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#anatomy')).toBeVisible();
  await expect(page.locator('#implementation')).toBeHidden();
  await expect(page.locator('#details')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Back to introduction' })).toHaveCount(0);

  const results = await makeAxeBuilder().analyze();
  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test.skip('page-nav collects inactive headings and opens their panel before moving focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'page-nav is absent below the desktop breakpoint');
  await gotoBlock(page, block);
  const nav = page.getByRole('navigation', { name: 'On this page' });

  await expect(nav.locator('ul a')).toHaveText(['Overview', 'Anatomy', 'Implementation', 'Technical details', 'Related resources']);
  await expect(page.locator('#details')).toBeHidden();
  await nav.getByRole('link', { name: 'Technical details' }).click();

  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.locator('#details')).toBeFocused();
  await expect(page).toHaveURL(/#details$/);

  await nav.getByRole('link', { name: 'Anatomy' }).click();
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#anatomy')).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#details')).toBeFocused();
  await page.goForward();
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#anatomy')).toBeFocused();
});

test('page-nav targets outside the marked range do not change tab selection', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'page-nav is absent below the desktop breakpoint');
  await gotoBlock(page, block);
  const details = page.getByRole('tab', { name: 'Details', exact: true });
  await details.click();

  await page.getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'Related resources' }).click();

  await expect(page.locator('#related')).toBeFocused();
  await expect(details).toHaveAttribute('aria-selected', 'true');
});

test('a direct hash link opens the matching tab panel', async ({ page }) => {
  await gotoBlock(page, { ...block, path: `${block.path}#details` });

  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.locator('#details')).toBeFocused();
});
