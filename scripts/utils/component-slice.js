import { getConfig } from '../ak.js';

const cache = new Map();

async function fetchSlice(slug) {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}/deps/status/${slug}.json`);
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

/**
 * Fetches one component's build-time status slice (deps/status/<slug>.json, written by
 * deps/build-status-index.js), or null when absent/unfetchable. Shared by
 * blocks/component-status.js (status pills) and scripts/utils/figma.js (the page-nav
 * "See in Figma" widget) so both read the same override-resolved data instead of each
 * re-deriving it. Cached per slug for the page's lifetime — both widgets resolve the same
 * slug from the same URL on the same page load, so this avoids a duplicate fetch.
 *
 * @param {string} slug
 * @returns {Promise<{ web: object, figmaPageId?: string } | null>}
 */
export function fetchComponentSlice(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, fetchSlice(slug));
  }
  return cache.get(slug);
}

/** Test-only: clears the module-scoped cache between tests. */
export function resetComponentSliceCacheForTests() {
  cache.clear();
}
