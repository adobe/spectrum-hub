import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../axe-test.js';
import { gotoBlock, formatViolations } from '../block-a11y.js';
import {
  imsScript, imsScriptSignedIn, ioProfile,
} from '../mocks.js';

const block = {
  name: 'profile',
  path: '/test/a11y/fixtures/profile.html',
  // rendered once loadIms() resolves and the placeholder is swapped for <se-profile>
  readySelector: 'se-profile se-button',
  // profile.js does el.replaceWith(cmp) — the .profile div is gone, replaced by <se-profile>
  ariaRoot: 'se-profile',
  routes: [
    {
      url: 'https://auth.services.adobe.com/imslib/imslib.min.js',
      contentType: 'application/javascript',
      body: imsScript,
    },
  ],
};

// The anonymous `block` config above only ever renders renderSignIn() — a bare
// "Sign in" se-button. It never touches the avatar-button/account-popover markup
// from renderProfile(), which is exactly where a missing alt/aria-label shipped
// undetected (see git history on blocks/profile/profile.js). This config drives
// the same fixture through the signed-in IMS mock so that markup actually gets
// scanned and snapshotted too.
const signedInBlock = {
  name: 'profile (signed in)',
  path: '/test/a11y/fixtures/profile-signed-in.html',
  readySelector: 'se-profile #avatar-button',
  ariaRoot: 'se-profile',
  routes: [
    {
      url: 'https://auth.services.adobe.com/imslib/imslib.min.js',
      contentType: 'application/javascript',
      body: imsScriptSignedIn,
    },
    {
      // IO_ENV.dev, matching profile-signed-in.html's setConfig({ env: 'dev' })
      url: 'https://cc-collab-stage.adobe.io/profile',
      contentType: 'application/json',
      body: ioProfile,
    },
  ],
};

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
    - button "Sign in"
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

test(`${signedInBlock.name} block in light/default mode has no WCAG 2.2 AA violations`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, signedInBlock);

  const results = await makeAxeBuilder()
    .disableRules(signedInBlock.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${signedInBlock.name} block matches its expected accessibility tree`, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'ARIA tree is browser/viewport-agnostic; only the chromium project needs to run it');

  await gotoBlock(page, signedInBlock);

  await expect(page.locator(signedInBlock.ariaRoot)).toMatchAriaSnapshot(`
    - button "Account menu, Jane Doe"
  `);
});

test(`${signedInBlock.name} account popover has no WCAG 2.2 AA violations once opened`, async ({ page, makeAxeBuilder }) => {
  await gotoBlock(page, signedInBlock);

  // The popover's contents (profile details + sign-out) are display:none until
  // opened, so a scan against the closed state alone would silently skip them.
  await page.locator('#avatar-button').click();
  await page.waitForSelector('#se-profile-popover:popover-open');
  // profile.css fades the popover in over 0.4s — scanning mid-fade catches axe
  // sampling the blended (partially transparent) text color against the page
  // background and misreports it as a contrast violation.
  await page.waitForFunction(() => {
    const popover = document.querySelector('se-profile')?.shadowRoot?.querySelector('#se-profile-popover');
    return popover && getComputedStyle(popover).opacity === '1';
  });

  const results = await makeAxeBuilder()
    .disableRules(signedInBlock.disableRules ?? [])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});

test(`${signedInBlock.name} block in dark mode has no WCAG 2.2 AA violations`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await gotoBlock(page, signedInBlock);

  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();

  await testInfo.attach('accessibility-scan-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
});
