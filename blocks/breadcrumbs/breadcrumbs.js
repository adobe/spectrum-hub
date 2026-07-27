import { getImplementationById } from '../../scripts/utils/implementations.js';

// V1 only covers the web component-page route `/web/<impl>/components/<slug>`;
// mobile has no implementation registry to validate against yet.
const SECTION = 'web';

/** Parses `/web/<impl>/components/<slug>`; null for any other shape or unregistered impl. */
export function resolveContext(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 4) { return null; }
  const [section, implId, componentsSegment, slug] = segments;
  if (section !== SECTION || componentsSegment !== 'components' || !slug) { return null; }
  const impl = getImplementationById(implId);
  if (!impl) { return null; }
  return { impl };
}

/** Web > <impl short label> > Components. Components has no href — no listing page exists. */
export function buildTrail(impl) {
  return [
    { label: 'Web', href: '/web/overview' },
    { label: impl.shortLabel, href: `/web/${impl.id}` },
    { label: 'Components', href: null },
  ];
}

/** An <ol> of crumbs for the given pathname, or null when it isn't a component page. */
export function buildBreadcrumbs(pathname) {
  const context = resolveContext(pathname);
  if (!context) { return null; }

  const ol = document.createElement('ol');
  buildTrail(context.impl).forEach(({ label, href }) => {
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
