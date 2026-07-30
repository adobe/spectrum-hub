/**
 * Per-component Dev + Design status pills.
 *
 * An author-placed block (mirrors blocks/breadcrumbs): a `<div class="component-status">`
 * dropped anywhere in the page's content. Shows two button-styled pills — Development (the
 * current implementation's status) and Design (the Figma status) — each a per-status icon
 * plus a "<kind> <status>" label (e.g. "Development available").
 *
 * Data comes from the build-time combined index (deps/build-status-index.js); labels bind
 * to the unified STATUSES model so they never drift from the adapter. When the path doesn't
 * resolve to an indexed component the block removes its own element (render nothing).
 */

import { getConfig } from '../../scripts/ak.js';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';
import { getSvgRef } from '../../scripts/utils/svg.js';
import { resolveImplementation } from '../../scripts/utils/go-to-impl.js';
import { resolveFigmaUrl, fetchFigmaData } from '../../scripts/utils/figma.js';

// Same combined index the status table reads.
const DEFAULT_INDEX = '/deps/status-index.json';

const NOT_AVAILABLE = 'not-available';

// The two pills. `column` overrides the index column looked up; when absent the
// pill uses the current code implementation from the path (the Development pill).
const PILLS = [
  { kind: 'dev', label: 'Development' },
  { kind: 'design', label: 'Design', column: 'figma' },
];

// The s2-icon glyph per unified status.
const STATUS_ICONS = {
  available: 'checkmarkcircle',
  experimental: 'magicwand',
  'not-available': 'closecircle',
  deprecated: 'minus',
  removed: 'removecircle',
};

/** `ActionButton` → `action-button`: the kebab slug used in component-page URLs. */
export const toSlug = (name) => name
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  .toLowerCase();

/**
 * Resolves a component-page pathname to its code implementation and slug.
 *
 * @param {string} pathname
 * @returns {{ impl: string, slug: string } | null} `null` unless the path is
 *   `/…/components/<slug>` under a registered code implementation (rsp/swc, never figma).
 */
export function resolveContext(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return null; }
  const impl = parts[idx - 1];
  const slug = parts[idx + 1];
  if (!slug || !getImplementationById(impl)) { return null; }
  return { impl, slug };
}

/** The index row whose canonical name kebab-matches `slug`, or `null`. */
export function findComponent(index, slug) {
  return (index.components ?? []).find((c) => toSlug(c.name) === slug) ?? null;
}

/**
 * One status pill: a per-status icon + "<kind> <status>" label. Rendered as an
 * external link when `link` resolves, otherwise a static span. Returns `null`
 * when the cell is absent.
 */
function buildPill({ kind, label: prefix }, cell, link) {
  if (!cell) { return null; }
  const status = STATUSES[cell.status] ?? STATUSES[NOT_AVAILABLE];
  const text = `${prefix} ${status.label.toLowerCase()}`; // e.g. "Development available"

  const pill = document.createElement(link ? 'a' : 'span');
  pill.className = 'component-status-pill';
  pill.dataset.kind = kind;
  pill.dataset.status = status.id;
  if (link) {
    pill.href = link.href;
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
    // Link text is just the status; name the destination and the new tab so the
    // link's purpose is clear (WCAG 2.4.4). The visible label stays in the name
    // (WCAG 2.5.3 Label in Name).
    pill.setAttribute('aria-label', `${text}. Opens ${link.dest} in a new tab.`);
  }

  const glyph = getSvgRef(STATUS_ICONS[status.id] ?? STATUS_ICONS[NOT_AVAILABLE], 'component-status-icon');
  glyph.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'component-status-label';
  label.textContent = text;

  pill.append(glyph, label);
  return pill;
}

async function fetchIndex() {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}${DEFAULT_INDEX}`);
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

/**
 * Kicks off (or reuses) the status-index + Figma-roster fetch. Called speculatively from
 * scripts.js's buildPageHeader as soon as the placeholder exists — well before this block's
 * own init() would normally run via the section-decoration loop — and stashes the in-flight
 * promise on the element itself, so init() awaits the same request instead of starting a
 * second one. Scoped to the element (not a module-level singleton) so two different
 * pages/tests never share stale state.
 */
export function prefetchStatusData(el) {
  el.pendingStatusFetch = Promise.all([fetchIndex(), fetchFigmaData()]);
  return el.pendingStatusFetch;
}

/**
 * Builds the Development + Design status pills for the current component page, or
 * an empty array when the path doesn't resolve or the component isn't indexed.
 *
 * @param {string} pathname
 * @param {object} index - the combined status index.
 * @param {Array} [figmaData] - the Figma component roster (for the Design link).
 * @returns {HTMLElement[]}
 */
export function buildPills(pathname, index, figmaData = []) {
  const context = resolveContext(pathname);
  if (!context || !index) { return []; }
  const component = findComponent(index, context.slug);
  if (!component) { return []; }
  const web = component.platforms?.web ?? {};

  // Link destinations reuse the page-nav widgets' URL logic exactly.
  const impl = resolveImplementation(pathname);
  const figmaHref = resolveFigmaUrl(context.slug, figmaData);
  const links = {
    dev: impl ? { href: impl.href, dest: `${impl.label} documentation` } : null,
    design: figmaHref ? { href: figmaHref, dest: 'Figma' } : null,
  };

  return PILLS
    .map((pill) => buildPill(pill, web[pill.column ?? context.impl], links[pill.kind]))
    .filter(Boolean);
}

export default async function init(el) {
  if (!resolveContext(window.location.pathname)) {
    el.remove();
    return;
  }

  const fetching = el.pendingStatusFetch ?? Promise.all([fetchIndex(), fetchFigmaData()]);
  const [index, figmaData] = await fetching;
  const pills = buildPills(window.location.pathname, index, figmaData);
  if (!pills.length) {
    el.remove();
    return;
  }

  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Component status');
  el.replaceChildren(...pills);
}
