/**
 * Shared helpers for the `/web/<impl>/components/<slug>` URL shape used by every code
 * implementation's component page: kebab-slugging a canonical name, and parsing the impl +
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

/**
 * The URL's impl segment (e.g. `rsp`/`swc`) and component slug from a
 * `/…/<impl>/components/<slug>` pathname — raw and unvalidated; callers decide whether the
 * impl segment is a real registered implementation. Both are `null` when the path has no
 * `components` segment.
 *
 * @param {string} pathname
 * @returns {{ impl: string|null, slug: string|null }}
 */
export function implAndSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return { impl: null, slug: null }; }
  return { impl: parts[idx - 1] ?? null, slug: parts[idx + 1] ?? null };
}
