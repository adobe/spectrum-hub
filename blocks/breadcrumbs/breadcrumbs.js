import { getImplementationById } from '../../scripts/utils/implementations.js';

// Segments with no listing page of their own — never a link, wherever they appear.
const NO_HREF_SEGMENTS = new Set(['components']);

/** 'action-button' -> 'Action Button' */
function humanize(segment) {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The ancestor segments to show as crumbs for any page, or null when there's nothing
 * above it: the homepage, a bare top-level section, or a section's own `/overview`
 * landing page (the site convention for "you're already at the section root").
 */
export function resolveContext(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) { return null; }
  if (segments[1] === 'overview') { return null; }
  return { segments: segments.slice(0, -1) };
}

/**
 * One crumb per ancestor segment. `web`'s second segment resolves to its registered
 * implementation's short label when recognized (falls back to a generic segment crumb
 * otherwise); `components` never links.
 */
export function buildTrail(segments) {
  return segments.map((segment, idx) => {
    if (NO_HREF_SEGMENTS.has(segment)) { return { label: humanize(segment), href: null }; }
    if (idx === 0 && segment === 'web') { return { label: 'Web', href: '/web/overview' }; }
    if (idx === 1 && segments[0] === 'web') {
      const impl = getImplementationById(segment);
      if (impl) { return { label: impl.shortLabel, href: `/web/${impl.id}` }; }
    }
    const href = `/${segments.slice(0, idx + 1).join('/')}`;
    return { label: humanize(segment), href };
  });
}

/** An <ol> of crumbs for the given pathname, or null when there's nothing to show above it. */
export function buildBreadcrumbs(pathname) {
  const context = resolveContext(pathname);
  if (!context) { return null; }

  const ol = document.createElement('ol');
  buildTrail(context.segments).forEach(({ label, href }) => {
    const li = document.createElement('li');
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      li.append(a);
    } else {
      li.textContent = label;
    }
    ol.append(li);
  });
  return ol;
}

export default function init(el) {
  const trail = buildBreadcrumbs(window.location.pathname);
  if (!trail) {
    el.remove();
    return;
  }
  el.append(trail);
}
