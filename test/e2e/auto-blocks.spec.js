import { test, expect } from './page-errors.js';

/**
 * Blocks no author places: the global shell every page composes, and the
 * per-template blocks scripts.js builds from metadata. A Pattern Library route
 * cannot cover these — they are decided by the page lifecycle, not by authored
 * content — so each is asserted on a page that is representative of how it
 * actually ships.
 *
 * Every selector is a repository-owned post-decoration hook, so a passing
 * assertion means the block's own code ran, not just that markup arrived.
 */

// An interior documentation page: the fullest version of the global shell,
// including the page-nav that the marketing homepage template omits.
const SHELL_ROUTE = '/content/voice-and-tone';

// `template: component` is the only template that builds a page hero, its
// breadcrumbs, and the component status pills.
const COMPONENT_ROUTE = '/web/rsp/components/button';

const routeContracts = [
  {
    name: 'global shell',
    path: SHELL_ROUTE,
    blocks: [
      { name: 'header', selector: 'header.header' },
      { name: 'sitenav', selector: '#sitenav nav' },
      { name: 'footer', selector: 'footer.footer' },
      { name: 'page-nav', selector: '.page-nav a' },
      // The authored anchor is rewritten into a real widget.
      { name: 'action-button', selector: 'button.action-button[data-widget]' },
    ],
  },
  {
    name: 'marketing template',
    path: '/',
    blocks: [
      {
        name: 'banner',
        // The homepage banner is audience-gated; an anonymous visitor keeps the
        // public row, and its button proves the block decorated rather than just survived.
        selector: '.banner .se-button',
      },
    ],
  },
  {
    name: 'component template',
    path: COMPONENT_ROUTE,
    blocks: [
      {
        name: 'breadcrumbs',
        // The block replaces its authored div with a labelled nav.
        selector: 'nav.breadcrumbs[aria-label="Breadcrumb"] ol li',
      },
      {
        name: 'page-hero',
        // scripts.js moves the page h1 into the hero it builds.
        selector: '.page-hero h1',
      },
      {
        name: 'component-status',
        // The block removes itself unless the path resolves to an indexed
        // component, so the group role is also proof the status slice resolved.
        selector: '.component-status[role="group"]',
      },
    ],
  },
];

const hasUnsupportedImsBranch = (baseURL) => {
  const { hostname } = new URL(baseURL);
  if (!hostname.endsWith('.aem.live')) { return false; }
  const [branch, repo, owner] = hostname.split('--');
  return Boolean(repo && owner && branch.length > 8);
};

for (const route of routeContracts) {
  test(`${route.name} composes on ${route.path}`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    expect(response.ok(), `${route.path} returned ${response.status()}`).toBe(true);

    for (const block of route.blocks) {
      await test.step(`${block.name} composes`, async () => {
        await expect(page.locator(block.selector).first()).toBeVisible();
      });
    }
  });
}

test('profile composes on the global shell', async ({ page, baseURL }) => {
  test.skip(
    hasUnsupportedImsBranch(baseURL),
    'Adobe IMS does not support .aem.live branch names longer than eight characters',
  );

  const response = await page.goto(SHELL_ROUTE, { waitUntil: 'domcontentloaded' });

  expect(response.ok(), `${SHELL_ROUTE} returned ${response.status()}`).toBe(true);
  await expect(page.locator('se-profile').first()).toBeVisible();
});
