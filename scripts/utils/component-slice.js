import { getConfig } from '../ak.js';

/**
 * Fetches one component's build-time status slice (deps/status/<slug>.json, written by
 * deps/build-status-index.js), or null when absent/unfetchable. Shared by
 * blocks/component-status.js (status pills) and scripts/utils/figma.js (the page-nav
 * "See in Figma" widget) so both read the same override-resolved data instead of each
 * re-deriving it.
 *
 * @param {string} slug
 * @returns {Promise<{ web: object, figmaPageId?: string } | null>}
 */
export async function fetchComponentSlice(slug) {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}/deps/status/${slug}.json`);
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}
