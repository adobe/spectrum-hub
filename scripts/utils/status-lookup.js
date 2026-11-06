/*
 * Resolves a component page path to its status in deps/status-index.json, the
 * same build-time index status-table reads. Keeps card-grid from needing a
 * `status` column on the query index, which would be a second source able to
 * disagree with the status pipeline.
 */

import { implAndSlugFromPath, toSlug } from './component-path.js';

// A design-only page has no code implementation, so its status is Figma's.
const DESIGN_ONLY = 'design-only';
const FIGMA = 'figma';

// One lookup per index object, so a grid of 91 rows does not rescan every
// component per row. Weak so a replaced index is not retained.
const lookups = new WeakMap();

/**
 * Two views of the index: components by their own slug, and the set of statuses
 * each shared page carries per platform and implementation. A `page` value in
 * deps/status-overrides.json redirects a component to a slug it shares with
 * another component documented on the same page, so a page slug can map to
 * more than one status.
 */
const lookupFor = (statusIndex) => {
  const cached = lookups.get(statusIndex);
  if (cached) { return cached; }

  const components = statusIndex.components ?? [];
  const bySlug = new Map(components.map((cmp) => [toSlug(cmp.name), cmp]));

  const byPage = new Map();
  components.forEach((cmp) => {
    Object.entries(cmp.platforms ?? {}).forEach(([platform, impls]) => {
      Object.entries(impls ?? {}).forEach(([implKey, cell]) => {
        if (!cell?.page) { return; }
        const key = `${platform}/${implKey}/${cell.page}`;
        const statuses = byPage.get(key) ?? new Set();
        statuses.add(cell.status ?? null);
        byPage.set(key, statuses);
      });
    });
  });

  const lookup = { bySlug, byPage };
  lookups.set(statusIndex, lookup);
  return lookup;
};

/**
 * The status id (`available`, `experimental`, …) for a component page, or null
 * when no status matches its platform, implementation and slug. The slug is
 * the segment immediately after `components`; trailing segments are ignored.
 *
 * A component's own slug takes precedence. If it has no matching status, the
 * shared-page fallback returns a status only when all matching entries agree
 * on one non-null status.
 *
 * @param {string} path - a `/<platform>/<impl>/components/<slug>` pathname.
 * @param {object|null} statusIndex - parsed deps/status-index.json.
 * @returns {string|null}
 */
export const statusForPath = (path, statusIndex) => {
  if (!statusIndex) { return null; }

  const { impl, slug } = implAndSlugFromPath(path);
  if (!impl || !slug) { return null; }

  const [platform] = path.split('/').filter(Boolean);
  const implKey = impl === DESIGN_ONLY ? FIGMA : impl;
  const { bySlug, byPage } = lookupFor(statusIndex);

  // A component's own slug wins over a page override that collides with it.
  const own = bySlug.get(slug)?.platforms?.[platform]?.[implKey]?.status;
  if (own) { return own; }

  const shared = byPage.get(`${platform}/${implKey}/${slug}`);
  if (shared?.size !== 1) { return null; }

  const [only] = shared;
  return only ?? null;
};
