import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';
import { componentDocsUrl } from '../../deps/rsp/docs.js';
import { toSlug, componentContextFromPath, componentSlugForPlatform } from './component-path.js';

const NATIVE_DOC_ALIASES = { 'toggle-button-same-content': 'toggle-button' };

const IMPLEMENTATIONS = {
  swc: {
    label: 'SWC',
    href: (component, { docsSection = 'components' } = {}) => (
      `https://spectrum-web-components.adobe.com/?path=/docs/${docsSection}-${component}--docs`
    ),
  },
  rsp: {
    label: 'RSP',
    href: (component, { package: pkg } = {}) => componentDocsUrl(pascalCase(component), pkg),
  },
  ios: {
    label: 'iOS',
    href: (component) => (
      `https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/${component.replaceAll('-', '')}`
    ),
  },
  android: {
    label: 'Android',
    href: (component) => {
      const symbol = component === 'snackbar' ? 'snackbar-host' : component;
      return `https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.${component.replaceAll('-', '')}/-spectrum-${symbol}.html`;
    },
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
  const context = componentContextFromPath(pathname);
  if (!context) { return null; }
  const { impl: implId, slug } = context;
  if (context.platform === 'web' && ['ios', 'android'].includes(implId)) { return null; }
  const impl = IMPLEMENTATIONS[implId];
  if (!impl || !slug) { return null; }
  const entry = componentNames[implId]?.[slug];
  const name = upstreamName === undefined ? entry?.docs : upstreamName;
  const nativeSlug = componentSlugForPlatform(slug, implId);
  const canonical = context.platform === 'web' ? slug : NATIVE_DOC_ALIASES[nativeSlug] ?? nativeSlug;
  const component = name ? toSlug(name) : canonical;
  return {
    label: impl.label,
    href: impl.href(component, { ...entry, package: pkg ?? entry?.package }),
  };
}

export function resolveImplementations(pathname, upstreamName) {
  const context = componentContextFromPath(pathname);
  if (context?.platform === 'mobile') {
    return ['ios', 'android'].map((platform) => (
      resolveImplementation(`/mobile/${platform}/components/${context.slug}`, upstreamName)
    ));
  }
  const target = resolveImplementation(pathname, upstreamName);
  return target ? [target] : [];
}

export function decorateGoToImpl(a, span) {
  const { pathname } = window.location;
  const { impl, slug } = componentContextFromPath(pathname) ?? {};
  // `docs`, not `export`: this builds a documentation link, and several components can
  // share one page. See buildImplComponentNames in deps/build-status-index.js.
  const entry = (impl && slug) ? IMPL_COMPONENT_NAMES[impl]?.[slug] : null;
  const upstreamName = entry?.docs ?? null;
  const targets = resolveImplementations(pathname, upstreamName);
  if (!targets.length) {
    a.remove();
    return;
  }
  const anchors = targets.map((target, index) => {
    const anchor = index === 0 ? a : a.cloneNode(true);
    anchor.href = target.href;
    anchor.setAttribute('aria-label', `Go to ${target.label}. Opens ${upstreamName ?? slug} in a new tab.`);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    (index === 0 ? span : anchor.querySelector('span')).textContent = `Go to ${target.label}`;
    return anchor;
  });
  a.replaceWith(...anchors);
}
