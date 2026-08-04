/**
 * Level-1 nav areas shown in the search popover before the user types.
 *
 * Read live from the sitenav's own fragment (site-nav.html) rather than
 * hardcoded, so the list stays in sync with the real sitenav. This module
 * deliberately does not import from blocks/sitenav/sitenav.js: that module's
 * body is a side-effecting IIFE that fetches and injects the whole sitenav
 * rail on import, which search must not force onto a page that doesn't want
 * one. It also does its own minimal fetch+parse rather than sitenav.js's
 * fetchRes, which additionally decorates blocks inside the fragment —
 * unneeded work here.
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

let cached = null;

/**
 * @param {Function} fetchImpl injectable for tests; defaults to global fetch
 * @returns {Promise<{label: string, description: string}[]>} cached for the page's lifetime
 */
export function fetchNavAreas(fetchImpl = fetch) {
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
