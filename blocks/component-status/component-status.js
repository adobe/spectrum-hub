/**
 * Per-component Code and Design pills.
 *
 * Authored rows preserve their label text, with a Code/Design kind, an existing
 * status, and an optional link on any page. Linked rows also supply page-nav actions.
 * Empty blocks use the current route and generated status data. Page-hero creates an
 * empty block for pages with `template: component` when no status block is provided.
 *
 * In automatic mode, web pages show Code and Design statuses. Mobile pages show native
 * Code documentation links only for platforms with resolved status data, plus
 * platform-specific Design statuses.
 * Native documentation links do not claim code availability; no native code status is ingested.
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
import { getConfig, removeForAudience } from '../../scripts/ak.js';
import { STATUS_PILLS, getAuthoredStatusBlocks } from '../../scripts/utils/authored-status.js';

const NOT_AVAILABLE = 'not-available';

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
 * One status pill with a per-status icon and a generated or authored label. Rendered as an
 * external link when `link` resolves, otherwise a static span. An absent cell
 * (e.g. Development on a design-only component) renders as Not available.
 */
function buildPill({
  kind, label: prefix, documentation = false, text: authoredText,
}, cell, link) {
  const status = STATUSES[cell?.status] ?? STATUSES[NOT_AVAILABLE];
  const text = authoredText
    ?? `${prefix} ${documentation ? 'documentation' : status.label.toLowerCase()}`;

  const pill = document.createElement(link ? 'a' : 'span');
  pill.className = 'component-status-pill';
  pill.dataset.kind = kind;
  if (!documentation) { pill.dataset.status = status.id; }
  if (link) {
    pill.href = link.href;
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
    // Name the destination and new tab (WCAG 2.4.4), keeping the visible label
    // in the accessible name (WCAG 2.5.3 Label in Name).
    pill.setAttribute('aria-label', `${text}. Opens ${link.dest} in a new tab.`);
  }

  const icon = documentation ? 'openin' : STATUS_ICONS[status.id] ?? STATUS_ICONS[NOT_AVAILABLE];
  const glyph = getSvgRef(icon, 'component-status-icon');
  glyph.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'component-status-label';
  label.textContent = text;

  pill.append(glyph, label);
  return pill;
}

function buildNativePills(context, componentData, platforms, figmaLinks) {
  const codePlatforms = platforms.filter((platform) => componentData[platform]);
  const code = resolveImplementations(context, codePlatforms).map((link) => buildPill(
    { kind: 'dev', label: `${link.label} Code`, documentation: true },
    null,
    { href: link.href, dest: `${link.label} documentation` },
  ));
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

export default async function init(el) {
  const page = el.closest('main');
  const authored = getAuthoredStatusBlocks(page ?? el);
  let pills;
  if (authored.has(el)) {
    // Preserve authored intent if audience filtering removes this block before the hero loads.
    if (page) { page.dataset.authoredComponentStatus = ''; }
    pills = authored.get(el).map((resource) => (
      buildPill(resource, { status: resource.status }, resource.link)
    ));
  } else {
    const context = resolveContext(window.location.pathname);
    if (!context) {
      el.remove();
      return;
    }
    const platforms = platformsForContext(context);
    const componentData = await fetchComponentPageSlice(context, platforms);
    pills = buildPills(context, componentData, platforms);
  }
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

  if (!el.hasAttribute('role')) { el.setAttribute('role', 'group'); }
  if (!el.hasAttribute('aria-label')) { el.setAttribute('aria-label', 'Component status'); }
  el.replaceChildren(...visiblePills);
}
