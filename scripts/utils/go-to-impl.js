import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';
import { toSlug, implAndSlugFromPath } from './component-path.js';

// The one page documenting every @react-spectrum/ai component. RSP publishes the AI cohort
// as sections of a single page rather than a page per component, so an AI component's link
// is an anchor on this page; the anchors are the export name lowercased (`#promptfield`).
const RSP_AI_DOCS = 'https://react-spectrum.adobe.com/ai-components.html';

// Each web implementation's docs site, keyed by the URL slug used in
// /web/<implementation>/components/<component>. `href` deep-links to the
// current component's page; `options.pkg` is the publishing package, for an
// implementation whose components do not all come from one.
const IMPLEMENTATIONS = {
  swc: {
    label: 'SWC',
    href: (component, { docsSection = 'components' } = {}) => (
      `https://spectrum-web-components.adobe.com/?path=/docs/${docsSection}-${component}--docs`
    ),
  },
  rsp: {
    label: 'RSP',
    href: (component, { pkg } = {}) => (pkg === 'ai'
      ? `${RSP_AI_DOCS}#${pascalCase(component).toLowerCase()}`
      : `https://react-spectrum.adobe.com/${pascalCase(component)}.html`),
  },
};

/**
 * `upstreamName` overrides the URL slug when the upstream docs site uses a different name.
 * `pkg` is the implementation's publishing package, for RSP the one recorded in
 * deps/impl-component-names.js; it is absent for everything in the default S2 package.
 */
export function resolveImplementation(pathname, upstreamName, pkg) {
  const { impl: implId, slug } = implAndSlugFromPath(pathname);
  const impl = IMPLEMENTATIONS[implId];
  if (!impl || !slug) { return null; }
  const { docsSection } = IMPL_COMPONENT_NAMES[implId]?.[slug] ?? {};
  const component = upstreamName ? toSlug(upstreamName) : slug;
  return { label: impl.label, href: impl.href(component, { pkg, docsSection }) };
}

// deps/impl-component-names.js (built by deps/build-status-index.js) is a couple dozen
// entries at most — small enough to ship as a static import instead of a per-page fetch,
// since the overwhelming majority of component pages have no entry at all for their
// impl/slug pair.
//
// if the page has no resolvable implementation the widget removes itself.
export function decorateGoToImpl(a, span) {
  const { pathname } = window.location;
  const { impl, slug } = implAndSlugFromPath(pathname);
  // `docs`, not `export`: this builds a documentation link, and several components can
  // share one page. See buildImplComponentNames in deps/build-status-index.js.
  const entry = (impl && slug) ? IMPL_COMPONENT_NAMES[impl]?.[slug] : null;
  const upstreamName = entry?.docs ?? null;
  const target = resolveImplementation(pathname, upstreamName, entry?.package);
  if (!target) {
    a.remove();
    return;
  }
  a.href = target.href;
  a.setAttribute('aria-label', `Go to ${target.label}. Opens ${upstreamName ?? slug} in a new tab.`);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = `Go to ${target.label}`;
}
