/**
 * Per-component Code and Design pills.
 *
 * Authored cells retain their content, links, and optional icons without
 * interpreting labels or statuses. Linked cells also supply page-nav actions.
 * Authored component-status elements without visible pills stay hidden and empty
 * so fragment insertion still suppresses automatic pills and page-nav actions.
 * Empty blocks use the current route and generated status data. Page-hero creates an
 * empty block for pages with `template: component` when no status block is provided.
 *
 * In automatic mode, web and mobile pages show Code and Design statuses. Native Code
 * temporarily uses documentation-link availability, not an ingested code status.
 * Missing native documentation targets render unlinked Code not available pills.
 *
 * Automatic data comes from a build-time slice (deps/status/<slug>.json, written by
 * deps/build-status-index.js) rather than the whole combined index — one small, targeted
 * fetch instead of downloading and searching the full multi-KB roster. Shared mobile pages
 * can resolve a different canonical slice per platform. Status matching uses the
 * unified STATUSES model. In automatic mode, the block removes itself on unsupported
 * routes or when no status slice can be fetched.
 */

import { STATUSES } from '../../scripts/utils/status-model.js';
import { getImplementationById } from '../../scripts/utils/implementations.js';
import { getSvgRef } from '../../scripts/utils/svg.js';
import { resolveImplementation, resolveImplementations } from '../../scripts/utils/go-to-impl.js';
import { getFigmaLinks } from '../../scripts/utils/figma.js';
import {
  componentContextFromPath, platformsForContext, NATIVE_PLATFORMS,
} from '../../scripts/utils/component-path.js';
import { fetchComponentPageSlice } from '../../scripts/utils/component-slice.js';
import { getConfig, getMetadata, removeForAudience } from '../../scripts/ak.js';
import {
  getAuthoredStatusBlocks, observeAuthoredStatusBlocks,
} from '../../scripts/utils/authored-status-cell.js';

const NOT_AVAILABLE = 'not-available';
const STATUS_PILLS = [
  { kind: 'dev', label: 'Code' },
  { kind: 'design', label: 'Design', column: 'figma' },
];
const authoredPositions = new WeakMap();

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
 * One automatic status pill with a per-status icon and generated label. Rendered as an
 * external link when `link` resolves, otherwise a static span. An absent cell
 * (e.g. Development on a design-only component) renders as Not available.
 */
function buildPill({ kind, label: prefix }, cell, link) {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];
  const text = `${prefix} ${status.label.toLowerCase()}`;

  const pill = document.createElement(link ? 'a' : 'span');
  pill.className = 'component-status-pill';
  pill.dataset.kind = kind;
  pill.dataset.status = status.id;
  if (link) {
    pill.href = link.href;
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
    // Name the destination and new tab (WCAG 2.4.4), keeping the visible label
    // in the accessible name (WCAG 2.5.3 Label in Name).
    pill.setAttribute('aria-label', `${text}. Opens ${link.dest} in a new tab.`);
  }

  const icon = STATUS_ICONS[status.id] ?? STATUS_ICONS[NOT_AVAILABLE];
  const glyph = getSvgRef(icon, 'component-status-icon');
  glyph.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'component-status-label';
  label.textContent = text;

  pill.append(glyph, label);
  return pill;
}

function buildNativePills(context, componentData, platforms, figmaLinks) {
  const code = resolveImplementations(context, platforms).map((link) => {
    const available = Boolean(componentData[link.context.platform]);
    return buildPill(
      { kind: 'dev', label: `${link.label} Code` },
      { status: available ? 'available' : NOT_AVAILABLE },
      available ? { href: link.href, dest: `${link.label} documentation` } : null,
    );
  });
  const design = platforms
    .filter((platform) => context.platform === 'mobile' || componentData[platform]?.figma)
    .map((platform) => {
      const label = context.platform === 'mobile' ? NATIVE_PLATFORMS[platform] : '';
      const link = figmaLinks.find((entry) => entry.platform === platform);
      return buildPill(
        { kind: 'design', label: `${label} Design`.trim() },
        componentData[platform]?.figma,
        link ? { href: link.href, dest: `${label} Figma`.trim() } : null,
      );
    });
  return [...code, ...design];
}

function buildWebPills(context, componentData, figmaLinks) {
  const cells = componentData[context.platform];

  // Development reuses the page-nav widgets' URL logic exactly; Design links straight to
  // the node id the build already resolved (no client-side Figma roster search needed).
  // The current impl's own cell may carry `upstreamName` (an aliased/shared page's real
  // upstream name) — see resolveImplementation.
  const impl = resolveImplementation(context, cells?.[context.impl]?.upstreamName ?? null);
  const [figmaLink] = figmaLinks;
  const links = {
    dev: impl ? { href: impl.href, dest: `${impl.label} documentation` } : null,
    design: figmaLink ? { href: figmaLink.href, dest: 'Figma' } : null,
  };

  return STATUS_PILLS
    .map((pill) => buildPill(pill, cells?.[pill.column ?? context.impl], links[pill.kind]))
    .filter(Boolean);
}

/** Build automatic pills from resolved page context and the selected platforms' data. */
export function buildPills(context, componentData, platforms = platformsForContext(context)) {
  if (!context || !componentData) { return []; }
  const figmaLinks = getFigmaLinks(context, componentData, platforms);
  return context.platform === 'web'
    ? buildWebPills(context, componentData, figmaLinks)
    : buildNativePills(context, componentData, platforms, figmaLinks);
}

function placeAuthoredStatus(el) {
  if (getMetadata('template') !== 'component') { return; }
  const page = el.closest('main') ?? document.querySelector('main');
  const hero = page?.querySelector('.page-hero') ?? el.closest('.page-hero');
  if (!hero) { return; }

  const place = () => {
    if (!(page ?? hero).contains(el)) { return false; }
    if (el.parentElement === hero && authoredPositions.has(el)) { return true; }
    for (const audience of ['audience-public', 'audience-private']) {
      if (el.closest(`.${audience}`)) { el.classList.add(audience); }
    }
    // Keep a source marker so late fragments retain their authoring order.
    let position = authoredPositions.get(el);
    if (!position) {
      position = document.createComment('component-status source');
      el.before(position);
      authoredPositions.set(el, position);
    }
    const placed = [...hero.children]
      .filter((block) => block !== el && authoredPositions.has(block));
    const following = placed.find((block) => (
      position.compareDocumentPosition(authoredPositions.get(block))
        === Node.DOCUMENT_POSITION_FOLLOWING
    ));
    const previous = placed.at(-1) ?? hero.querySelector(':scope > .description');
    hero.insertBefore(el, following ?? previous?.nextElementSibling ?? null);
    return true;
  };

  if (!place()) {
    // Fragments decorate outside main before being inserted into the page.
    const stopObserving = observeAuthoredStatusBlocks(page, () => {
      if (place()) { stopObserving(); }
    });
  }
}

export default async function init(el) {
  const page = el.closest('main');
  const authored = getAuthoredStatusBlocks(page ?? el);
  let pills;
  if (authored.has(el)) {
    // Preserve authored intent if audience filtering removes this block before the hero loads.
    if (page) { page.dataset.authoredComponentStatus = ''; }
    pills = authored.get(el);
    pills.forEach((pill) => {
      pill.classList.add('component-status-pill');
      pill.dataset.kind = 'authored';
      pill.dataset.status = 'authored';
    });
  } else {
    if (authored.size) {
      el.remove();
      return;
    }
    const context = resolveContext(window.location.pathname);
    if (!context) {
      el.remove();
      return;
    }
    const platforms = platformsForContext(context);
    const componentData = await fetchComponentPageSlice(context, platforms);
    pills = buildPills(context, componentData, platforms);
  }
  const fragment = document.createDocumentFragment();
  fragment.append(...pills);
  const designPills = authored.has(el) ? [] : [...fragment.querySelectorAll('[data-kind="design"]')];
  try {
    await Promise.all(designPills.map((privateEl) => removeForAudience({ privateEl })));
  } catch (error) {
    getConfig().log(error);
    designPills.forEach((pill) => pill.remove());
  }
  const visiblePills = [...fragment.children];

  if (!visiblePills.length) {
    if (authored.has(el)) {
      el.replaceChildren();
      el.hidden = true;
      placeAuthoredStatus(el);
    } else {
      el.remove();
    }
    return;
  }
  if (!authored.has(el) && page && getAuthoredStatusBlocks(page).size) {
    el.remove();
    return;
  }

  if (!el.hasAttribute('role')) { el.setAttribute('role', 'group'); }
  if (!el.hasAttribute('aria-label')) { el.setAttribute('aria-label', 'Component status'); }
  el.replaceChildren(...visiblePills);
  if (authored.has(el)) {
    placeAuthoredStatus(el);
  } else if (page) {
    const stopObserving = observeAuthoredStatusBlocks(page, () => {
      el.remove();
      stopObserving();
    });
  }
}
