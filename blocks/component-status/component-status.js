/**
 * Per-component Dev + Design status pills.
 *
 * An author-placed block (mirrors blocks/breadcrumbs): a `<div class="component-status">`
 * dropped anywhere in the page's content. Shows two button-styled pills — Development (the
 * current implementation's status) and Design (the Figma status) — each a per-status icon
 * plus a "<kind> <status>" label (e.g. "Development available").
 *
 * Data comes from a per-component build-time slice (deps/status/<slug>.json, written by
 * deps/build-status-index.js) rather than the whole combined index — one small, targeted
 * fetch instead of downloading and searching the full multi-KB roster. Labels bind to the
 * unified STATUSES model so they never drift from the adapter. When the path doesn't
 * resolve to an indexed component the block removes its own element (render nothing).
 */

import { STATUSES } from '../../scripts/utils/status-model.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';
import { getSvgRef } from '../../scripts/utils/svg.js';
import { getConfig } from '../../scripts/ak.js';
import { resolveImplementation } from '../../scripts/utils/go-to-impl.js';
import { figmaNodeUrl } from '../../scripts/utils/figma.js';
import { implAndSlugFromPath } from '../../scripts/utils/component-path.js';

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

/**
 * Resolves a component-page pathname to its code implementation and slug.
 *
 * @param {string} pathname
 * @returns {{ impl: string, slug: string } | null} `null` unless the path is
 *   `/…/components/<slug>` under a registered code implementation (rsp/swc, never figma).
 */
export function resolveContext(pathname) {
  const { impl, slug } = implAndSlugFromPath(pathname);
  if (!slug || !getImplementationById(impl)) { return null; }
  return { impl, slug };
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

/** Fetches one component's status slice (deps/status/<slug>.json), or null when absent. */
export async function fetchComponentSlice(slug) {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}/deps/status/${slug}.json`);
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
}

/**
 * Kicks off (or reuses) the component's status-slice fetch. Called speculatively from
 * scripts.js's buildPageHeader as soon as the placeholder exists — well before this block's
 * own init() would normally run via the section-decoration loop — and stashes the in-flight
 * promise on the element itself, so init() awaits the same request instead of starting a
 * second one. Scoped to the element (not a module-level singleton) so two different
 * pages/tests never share stale state.
 */
export function prefetchStatusData(el) {
  const context = resolveContext(window.location.pathname);
  el.pendingStatusFetch = context ? fetchComponentSlice(context.slug) : Promise.resolve(null);
  return el.pendingStatusFetch;
}

/**
 * Builds the Development + Design status pills for the current component page, or
 * an empty array when the path doesn't resolve or the component has no slice.
 *
 * @param {string} pathname
 * @param {{ web: object, figmaPageId?: string } | null} componentData - this component's slice.
 * @returns {HTMLElement[]}
 */
export function buildPills(pathname, componentData) {
  const context = resolveContext(pathname);
  if (!context || !componentData) { return []; }
  const web = componentData.web ?? {};

  // Development reuses the page-nav widgets' URL logic exactly; Design links straight to
  // the node id the build already resolved (no client-side Figma roster search needed).
  // The current impl's own cell may carry `originalName` (an aliased/shared page's real
  // upstream name) — see resolveImplementation.
  const impl = resolveImplementation(pathname, web[context.impl]?.originalName);
  const figmaHref = figmaNodeUrl(componentData.figmaPageId);
  const links = {
    dev: impl ? { href: impl.href, dest: `${impl.label} documentation` } : null,
    design: figmaHref ? { href: figmaHref, dest: 'Figma' } : null,
  };

  return PILLS
    .map((pill) => buildPill(pill, web[pill.column ?? context.impl], links[pill.kind]))
    .filter(Boolean);
}

export default async function init(el) {
  const context = resolveContext(window.location.pathname);
  if (!context) {
    el.remove();
    return;
  }

  const componentData = await (el.pendingStatusFetch ?? fetchComponentSlice(context.slug));
  const pills = buildPills(window.location.pathname, componentData);
  if (!pills.length) {
    el.remove();
    return;
  }

  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Component status');
  el.replaceChildren(...pills);
}
