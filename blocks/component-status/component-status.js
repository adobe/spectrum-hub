/**
 * Per-component Dev + Design status pills.
 *
 * An author-placed block (mirrors blocks/breadcrumbs): a `<div class="component-status">`
 * dropped anywhere in the page's content. Web pages show Code and Design pills.
 * Shared mobile pages show a labelled Design status for each native platform.
 * Each pill has a per-status icon and a "<kind> <status>" label.
 *
 * Data comes from a per-component build-time slice (deps/status/<slug>.json, written by
 * deps/build-status-index.js) rather than the whole combined index — one small, targeted
 * fetch instead of downloading and searching the full multi-KB roster. Shared mobile pages
 * can resolve a different canonical slice per platform. Labels bind to the
 * unified STATUSES model so they never drift from the adapter. When the path doesn't
 * resolve to an indexed component the block removes its own element (render nothing).
 */

import { STATUSES } from '../../scripts/utils/status-model.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';
import { getSvgRef } from '../../scripts/utils/svg.js';
import { resolveImplementation } from '../../scripts/utils/go-to-impl.js';
import { getFigmaLinks, NATIVE_PLATFORMS } from '../../scripts/utils/figma.js';
import { componentContextFromPath } from '../../scripts/utils/component-path.js';
import { fetchComponentPageSlice } from '../../scripts/utils/component-slice.js';
import { getConfig, removeForAudience } from '../../scripts/ak.js';

const NOT_AVAILABLE = 'not-available';

// The two pills. `column` overrides the index column looked up; when absent the
// pill uses the current code implementation from the path (the Development/Code pill).
const PILLS = [
  { kind: 'dev', label: 'Code' },
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
 * Resolves a component or pattern pathname to its platform, implementation, and slug.
 *
 * @param {string} pathname
 * @returns {{ platform: string, impl: string|null, slug: string } | null}
 *   Web routes require a registered implementation; shared mobile pages have no code impl.
 */
export function resolveContext(pathname) {
  const context = componentContextFromPath(pathname);
  if (!context || (context.platform === 'web' && !getImplementationById(context.impl))) {
    return null;
  }
  return context;
}

/**
 * One status pill: a per-status icon + "<kind> <status>" label. Rendered as an
 * external link when `link` resolves, otherwise a static span. An absent cell
 * (e.g. Development on a design-only component) renders as Not available.
 */
function buildPill({ kind, label: prefix }, cell, link) {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];
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

/**
 * Builds the Code and platform-specific Design status pills for the current page, or
 * an empty array when the path doesn't resolve or the component has no slice.
 *
 * @param {string} pathname
 * @param {{ web?: object, ios?: object, android?: object } | null} componentData
 *   This component's platform-specific status slice.
 * @returns {HTMLElement[]}
 */
export function buildPills(pathname, componentData) {
  const context = resolveContext(pathname);
  if (!context || !componentData) { return []; }
  const figmaLinks = getFigmaLinks(pathname, componentData);
  if (context.platform === 'mobile') {
    return Object.entries(NATIVE_PLATFORMS).map(([platform, label]) => {
      const link = figmaLinks.find((entry) => entry.platform === platform);
      return buildPill(
        { kind: 'design', label: `${label} Design` },
        componentData[platform]?.figma,
        link ? { href: link.href, dest: `${label} Figma` } : null,
      );
    });
  }
  const cells = componentData[context.platform];
  if (context.platform !== 'web' && !cells?.figma) { return []; }

  // Development reuses the page-nav widgets' URL logic exactly; Design links straight to
  // the node id the build already resolved (no client-side Figma roster search needed).
  // The current impl's own cell may carry `upstreamName` (an aliased/shared page's real
  // upstream name) — see resolveImplementation.
  const impl = context.platform === 'web'
    ? resolveImplementation(pathname, cells?.[context.impl]?.upstreamName ?? null)
    : null;
  const [figmaLink] = figmaLinks;
  const links = {
    dev: impl ? { href: impl.href, dest: `${impl.label} documentation` } : null,
    design: figmaLink ? { href: figmaLink.href, dest: 'Figma' } : null,
  };

  return PILLS
    .filter((pill) => context.platform === 'web' || pill.kind === 'design')
    .map((pill) => buildPill(pill, cells?.[pill.column ?? context.impl], links[pill.kind]))
    .filter(Boolean);
}

export default async function init(el) {
  const context = resolveContext(window.location.pathname);
  if (!context) {
    el.remove();
    return;
  }

  const componentData = await fetchComponentPageSlice(context);
  const pills = buildPills(window.location.pathname, componentData);
  if (!pills.length) {
    el.remove();
    return;
  }

  const fragment = document.createDocumentFragment();
  fragment.append(...pills);
  const designPills = [...fragment.querySelectorAll('[data-kind="design"]')];
  try {
    await Promise.all(designPills.map((privateEl) => removeForAudience({ privateEl })));
  } catch (error) {
    getConfig().log(error);
    designPills.forEach((pill) => pill.remove());
  }
  const visiblePills = [...fragment.children];

  if (!visiblePills.length) {
    el.remove();
    return;
  }

  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Component status');
  el.replaceChildren(...visiblePills);
}
