import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';
import { componentDocsUrl } from '../../deps/rsp/docs.js';
import { toSlug, implAndSlugFromPath } from './component-path.js';

const IMPLEMENTATIONS = {
  swc: {
    label: 'SWC',
    href: (component, { docsSection = 'components' } = {}) => (
      `https://spectrum-web-components.adobe.com/?path=/docs/${docsSection}-${component}--docs`
    ),
  },
  rsp: {
    label: 'RSP',
    href: (component, pkg) => componentDocsUrl(pascalCase(component), pkg),
  },
};

/**
 * Undefined overrides use the generated metadata; a null name retains the URL slug.
 * `componentNames` can supply an independent catalog without mutating the shared import.
 */
export function resolveImplementation(
  pathname,
  upstreamName,
  pkg,
  componentNames = IMPL_COMPONENT_NAMES,
) {
  const { impl: implId, slug } = implAndSlugFromPath(pathname);
  const impl = IMPLEMENTATIONS[implId];
  if (!impl || !slug) { return null; }
  const entry = componentNames[implId]?.[slug];
  const name = upstreamName === undefined ? entry?.docs : upstreamName;
  const component = name ? toSlug(name) : slug;
  return { label: impl.label, href: impl.href(component, pkg ?? entry?.package) };
}

export function decorateGoToImpl(a, span) {
  const { pathname } = window.location;
  const { impl, slug } = implAndSlugFromPath(pathname);
  // `docs`, not `export`: this builds a documentation link, and several components can
  // share one page. See buildImplComponentNames in deps/build-status-index.js.
  const entry = (impl && slug) ? IMPL_COMPONENT_NAMES[impl]?.[slug] : null;
  const upstreamName = entry?.docs ?? null;
  const target = resolveImplementation(pathname, upstreamName);
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
