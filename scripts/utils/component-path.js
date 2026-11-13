/**
 * Shared helpers for component and nested web pattern routes:
 * kebab-slugging a canonical name, and parsing the impl +
 * slug back out of a pathname. Dependency-free so it's safe to import from both the browser
 * (component-status.js, go-to-impl.js, status-table.js) and the Node build script
 * (deps/build-status-index.js) — one definition instead of each consumer hand-copying it.
 */

/**
 * `ActionButton` -> `action-button`: the kebab slug used in component-page URLs
 * (`/web/<impl>/components/<slug>`) and in the per-component status file names
 * (`deps/status/<slug>.json`).
 *
 * @param {string} name - a canonical PascalCase component name.
 * @returns {string}
 */
export function toSlug(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const MOBILE_PAGE_COMPONENTS = {
  buttons: { ios: 'button', android: 'button' },
  switches: { ios: 'switch', android: 'switch' },
  'snackbars-and-toasts': { ios: 'toast', android: 'snackbar' },
  'toggle-buttons': { ios: 'toggle-button', android: 'toggle-button-same-content' },
};

export function componentSlugForPlatform(slug, platform) {
  return MOBILE_PAGE_COMPONENTS[slug]?.[platform] ?? slug;
}

function patternContextFromParts(parts) {
  const idx = parts.indexOf('patterns');
  if (idx < 2 || parts[idx - 2] !== 'web' || parts.length < idx + 3) { return null; }
  return { platform: 'web', impl: parts[idx - 1], slug: parts.at(-1) };
}

/**
 * The URL's impl segment (e.g. `rsp`/`swc`) and component slug from a
 * `/…/<impl>/components/<slug>` pathname — raw and unvalidated; callers decide whether the
 * impl segment is a real registered implementation. Nested web pattern routes use the
 * final slug after the group. Both are `null` when neither route shape matches.
 *
 * @param {string} pathname
 * @returns {{ impl: string|null, slug: string|null }}
 */
export function implAndSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) {
    const context = patternContextFromParts(parts);
    return { impl: context?.impl ?? null, slug: context?.slug ?? null };
  }
  return { impl: parts[idx - 1] ?? null, slug: parts[idx + 1] ?? null };
}

/** Resolves component and web pattern routes without a platform fallback. */
export function componentContextFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 0) { return patternContextFromParts(parts); }
  if (idx === 1 && parts[0] === 'mobile' && parts.length === 3) {
    return { platform: 'mobile', impl: null, slug: parts[2] };
  }
  if (idx < 2 || !parts[idx + 1] || parts.length !== idx + 2) { return null; }
  const impl = parts[idx - 1];
  if (parts[idx - 2] === 'web') {
    return { platform: 'web', impl, slug: parts[idx + 1] };
  }
  if (parts[idx - 2] === 'mobile' && ['ios', 'android'].includes(impl)) {
    return { platform: impl, impl, slug: parts[idx + 1] };
  }
  return null;
}
