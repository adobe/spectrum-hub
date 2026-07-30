/**
 * `ActionButton` -> `action-button`: the kebab slug used in component-page URLs
 * (`/web/<impl>/components/<slug>`) and in the per-component status file names
 * (`deps/status/<slug>.json`). Shared between the browser (component-status.js) and the
 * Node build script (deps/build-status-index.js) — dependency-free so it's safe in both.
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
