import { getConfig } from '../ak.js';
import { componentSlugForPlatform } from './component-path.js';

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
 * @returns {Promise<{ web?: object, ios?: object, android?: object } | null>}
 */
export function fetchComponentSlice(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, fetchSlice(slug));
  }
  return cache.get(slug);
}

/** Resolves mobile DA aliases without renaming or mixing canonical component slices. */
export async function fetchComponentPageSlice({ slug, platform }) {
  if (platform === 'web') { return fetchComponentSlice(slug); }
  const platforms = platform === 'mobile' ? ['ios', 'android'] : [platform];
  const slices = await Promise.all(platforms.map((nativePlatform) => (
    fetchComponentSlice(componentSlugForPlatform(slug, nativePlatform))
  )));
  if (slices.every((slice) => !slice)) { return null; }
  return Object.fromEntries(platforms.flatMap((nativePlatform, index) => {
    const cells = slices[index]?.[nativePlatform];
    return cells ? [[nativePlatform, cells]] : [];
  }));
}

/** Test-only: clears the module-scoped cache between tests. */
export function resetComponentSliceCacheForTests() {
  cache.clear();
}
