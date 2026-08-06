/**
 * Level-1 nav areas shown in the search popover before the user types.
 *
 * Prefers reading labels straight off the sitenav's own already-decorated
 * DOM (built by blocks/sitenav/sitenav.js, which normally finishes well
 * before a user gets around to opening search) — that avoids fetching and
 * re-parsing the exact fragment sitenav.js already fetched. Falls back to
 * a plain fetch+parse of the fragment itself for pages that load search
 * but intentionally have no sitenav, or for the rare case search opens
 * before sitenav's own async decoration has finished.
 *
 * This module deliberately does not import from blocks/sitenav/sitenav.js:
 * that module's body is a side-effecting IIFE that fetches and injects the
 * whole sitenav rail on import, which search must not force onto a page
 * that doesn't want one. The fetch fallback below also does its own
 * minimal parse rather than sitenav.js's fetchRes, which additionally
 * decorates blocks inside the fragment — unneeded work here.
 */

const SITE_NAV_PATH = '/fragments/nav/site-nav';

// site-nav.html has no description field for level-1 items (they're pure
// toggles, not links to a page), so this copy lives here instead.
// TODO(content): confirm/replace "Support" — not shown in the design
// reference this map was built from.
export const NAV_AREA_DESCRIPTIONS = {
  'Getting started': 'Introduction, principles, and how to begin',
  Foundations: 'Color, typography, spacing, and design principles',
  Content: 'Voice, tone, and writing guidelines',
  Mobile: 'Components and patterns for iOS and Android',
  Web: 'Components, patterns, and principles for the web',
  Support: 'Get help and connect with the team',
};

/**
 * @param {string} html the site-nav fragment's raw HTML
 * @returns {{label: string, description: string}[]} level-1 areas, in order
 */
export function parseLevel1Areas(html) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const labels = dom.querySelectorAll('main > div > ul > li > p');
  return [...labels].map((p) => {
    const label = p.textContent.trim();
    return { label, description: NAV_AREA_DESCRIPTIONS[label] ?? '' };
  });
}

// Matches the level-1 <li>/<button> shape blocks/sitenav/sitenav.js's
// decorateLevel() produces. Kept as a selector string rather than an
// import for the same reason as the file-level comment above.
const SITENAV_LEVEL_1_BUTTON_SELECTOR = '#sitenav .level-1-list > li.level-1 > .level-1-button';

/**
 * @param {ParentNode} root injectable for tests; defaults to document
 * @returns {{label: string, description: string}[] | null} level-1 areas
 *   read from an already-decorated sitenav, or null if none is present yet
 */
export function readLevel1AreasFromSitenav(root = document) {
  const buttons = root.querySelectorAll(SITENAV_LEVEL_1_BUTTON_SELECTOR);
  if (!buttons.length) { return null; }
  return [...buttons].map((btn) => {
    // Toggle-only items carry their label in a child span; linked items
    // (decorateLevel's "linked-list" case) carry it as the button's
    // aria-label instead.
    const label = (
      btn.querySelector('.list-item-label')?.textContent ?? btn.getAttribute('aria-label') ?? ''
    ).trim();
    return { label, description: NAV_AREA_DESCRIPTIONS[label] ?? '' };
  });
}

let cached = null;

/**
 * @param {Function} fetchImpl injectable for tests; defaults to global fetch
 * @param {ParentNode} root injectable for tests; defaults to document
 * @returns {Promise<{label: string, description: string}[]>} cached for the page's lifetime
 */
export function fetchNavAreas(fetchImpl = fetch, root = document) {
  const fromSitenav = readLevel1AreasFromSitenav(root);
  if (fromSitenav) { return Promise.resolve(fromSitenav); }

  cached ??= fetchImpl(SITE_NAV_PATH)
    .then((resp) => (resp.ok ? resp.text() : ''))
    .then(parseLevel1Areas)
    .catch(() => []);
  return cached;
}

/** Test-only: clears the module-scoped cache between tests. */
export function resetNavAreasCacheForTests() {
  cached = null;
}
