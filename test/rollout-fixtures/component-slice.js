import { getConfig } from '../../scripts/ak.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';
import { toSlug } from './component-path.js';
import * as componentPath from './component-path.js';

// Cached preparation helper; the new APIs were still dormant.
// TODO(cache-rollout): Delete with test/blocks/cache-rollout.test.js in figma-rollout-3-cleanup
// after the documented cache-retirement gates are met.
const cache = new Map();

export function componentSlugForPlatform(slug, platform, componentNames = IMPL_COMPONENT_NAMES) {
  return toSlug(componentNames[platform]?.[slug]?.canonical ?? slug);
}

async function fetchSlice(slug) {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}/deps/status/${slug}.json`);
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

export function fetchComponentSlice(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, fetchSlice(slug));
  }
  return cache.get(slug);
}

export async function fetchComponentPageSlice(
  context,
  platforms = componentPath.platformsForContext(context),
) {
  const { slug, platform } = context;
  if (platform === 'web') { return fetchComponentSlice(slug); }
  const slices = await Promise.all(platforms.map((nativePlatform) => (
    fetchComponentSlice(componentSlugForPlatform(slug, nativePlatform))
  )));
  if (slices.every((slice) => !slice)) { return null; }
  return Object.fromEntries(platforms.flatMap((nativePlatform, index) => {
    const cells = slices[index]?.[nativePlatform];
    return cells ? [[nativePlatform, cells]] : [];
  }));
}

export function resetComponentSliceCacheForTests() {
  cache.clear();
}
