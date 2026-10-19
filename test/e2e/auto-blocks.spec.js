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
const SHELL_ROUTE = '/support/faqs';

// `template: component` is the only template that builds a page hero, its
// breadcrumbs, and the component status pills.
const COMPONENT_ROUTE = '/web/rsp/components/button';

const shellBlocks = [
  { name: 'header', selector: 'header.header' },
  { name: 'sitenav', selector: '#sitenav nav' },
  { name: 'footer', selector: 'footer.footer' },
  { name: 'page-nav', selector: '.page-nav a' },
  // Both are link blocks: an anchor scripts.js rewrites into a real widget.
  // Matching the rewritten element proves the rewrite happened.
  { name: 'action-button', selector: 'button.action-button[data-widget]' },
  { name: 'profile', selector: 'se-profile' },
];

const templateBlocks = [
  {
    name: 'banner',
    path: '/',
    // The homepage banner is audience-gated; an anonymous visitor keeps the
    // public row, and its button proves the block decorated rather than just survived.
    selector: '.banner .se-button',
  },
  {
    name: 'breadcrumbs',
    path: COMPONENT_ROUTE,
    // The block replaces its authored div with a labelled nav.
    selector: 'nav.breadcrumbs[aria-label="Breadcrumb"] ol li',
  },
  {
    name: 'page-hero',
    path: COMPONENT_ROUTE,
    // scripts.js moves the page h1 into the hero it builds.
    selector: '.page-hero h1',
  },
  {
    name: 'component-status',
    path: COMPONENT_ROUTE,
    // The block removes itself unless the path resolves to an indexed
    // component, so the group role is also proof the status slice resolved.
    selector: '.component-status[role="group"]',
  },
];

test.describe('global shell', () => {
  for (const block of shellBlocks) {
    test(`${block.name} composes on every page`, async ({ page }) => {
      const response = await page.goto(SHELL_ROUTE, { waitUntil: 'domcontentloaded' });

      expect(response.ok(), `${SHELL_ROUTE} returned ${response.status()}`).toBe(true);
      await expect(page.locator(block.selector).first()).toBeVisible();
    });
  }
});

test.describe('template blocks', () => {
  for (const block of templateBlocks) {
    test(`${block.name} composes on ${block.path}`, async ({ page }) => {
      const response = await page.goto(block.path, { waitUntil: 'domcontentloaded' });

      expect(response.ok(), `${block.path} returned ${response.status()}`).toBe(true);
      await expect(page.locator(block.selector).first()).toBeVisible();
    });
  }
});
