import { getConfig } from '../../scripts/ak.js';

// Cached main helper, before context-based slice fetching existed.
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

export function fetchComponentSlice(slug) {
  if (!cache.has(slug)) {
    cache.set(slug, fetchSlice(slug));
  }
  return cache.get(slug);
}

export function resetComponentSliceCacheForTests() {
  cache.clear();
}
