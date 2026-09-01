import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import IMPL_ALIASES from '../../deps/impl-aliases.js';
import { toSlug, implAndSlugFromPath } from './component-path.js';

// Each web implementation's docs site, keyed by the URL slug used in
// /web/<implementation>/components/<component>. `href` deep-links to the
// current component's page.
const IMPLEMENTATIONS = {
  swc: {
    label: 'SWC',
    href: (component) => `https://spectrum-web-components.adobe.com/?path=/docs/components-${component}--docs`,
  },
  rsp: {
    label: 'RSP',
    href: (component) => `https://react-spectrum.adobe.com/${pascalCase(component)}.html`,
  },
};

/** `upstreamName` overrides the URL slug when the upstream docs site uses a different name. */
export function resolveImplementation(pathname, upstreamName) {
  const { impl: implId, slug } = implAndSlugFromPath(pathname);
  const impl = IMPLEMENTATIONS[implId];
  if (!impl || !slug) { return null; }
  const component = upstreamName ? toSlug(upstreamName) : slug;
  return { label: impl.label, href: impl.href(component) };
}

// deps/impl-aliases.js (built by deps/build-status-index.js) is a couple dozen entries at
// most — small enough to ship as a static import instead of a per-page fetch, since the
// overwhelming majority of component pages have no alias at all for their impl/slug pair.
//
// if the page has no resolvable implementation the widget removes itself.
export function decorateGoToImpl(a, span) {
  const { pathname } = window.location;
  const { impl, slug } = implAndSlugFromPath(pathname);
  const upstreamName = (impl && slug) ? IMPL_ALIASES[impl]?.[slug] ?? null : null;
  const target = resolveImplementation(pathname, upstreamName);
  if (!target) {
    a.remove();
    return;
  }
  a.href = target.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = `Go to ${target.label}`;
}
