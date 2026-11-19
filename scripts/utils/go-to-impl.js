import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';
import { componentDocsUrl } from '../../deps/rsp/docs.js';
import { toSlug, implAndSlugFromPath } from './component-path.js';
// TODO(cache-rollout): Restore named imports after cached pre-preparation modules expire.
import * as componentPath from './component-path.js';
import * as componentSlice from './component-slice.js';

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
    href: (component, { package: pkg = component } = {}) => (
      `https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.${toSlug(pkg).replaceAll('-', '')}/-spectrum-${component}.html`
    ),
  },
};

/**
 * Undefined overrides use the generated metadata; a null name retains the URL slug.
 * `componentNames` can supply an independent catalog without mutating the shared import.
 */
export function resolveImplementation(
  pathnameOrContext,
  upstreamName,
  pkg,
  componentNames = IMPL_COMPONENT_NAMES,
) {
  // TODO(cache-rollout): Remove pathname support after cached old consumers expire.
  const context = typeof pathnameOrContext === 'string'
    ? { platform: 'web', ...implAndSlugFromPath(pathnameOrContext) } : pathnameOrContext;
  if (!context) { return null; }
  const { impl: implId, slug } = context;
  if (context.platform === 'web' && ['ios', 'android'].includes(implId)) { return null; }
  const impl = IMPLEMENTATIONS[implId];
  if (!impl || !slug) { return null; }
  const entry = componentNames[implId]?.[slug];
  const name = upstreamName === undefined ? entry?.docs : upstreamName;
  const canonical = context.platform === 'web'
    ? slug : componentSlice.componentSlugForPlatform(slug, implId, componentNames);
  const component = name ? toSlug(name) : canonical;
  return {
    label: impl.label,
    href: impl.href(component, { ...entry, package: pkg ?? entry?.package }),
  };
}

export function resolveImplementations(
  context,
  platforms = componentPath.platformsForContext(context),
) {
  return platforms.flatMap((platform) => {
    const targetContext = {
      ...context,
      platform,
      impl: platform === 'web' ? context.impl : platform,
    };
    const target = resolveImplementation(targetContext);
    return target ? [{ ...target, context: targetContext }] : [];
  });
}

export async function decorateGoToImpl(a, span) {
  const context = componentPath.componentContextFromPath(window.location.pathname);
  const platforms = componentPath.platformsForContext(context);
  const { impl, slug } = context ?? {};
  // `docs`, not `export`: this builds a documentation link, and several components can
  // share one page. See buildImplComponentNames in deps/build-status-index.js.
  const entry = (impl && slug) ? IMPL_COMPONENT_NAMES[impl]?.[slug] : null;
  const upstreamName = entry?.docs;
  const targets = (await Promise.all(
    resolveImplementations(context, platforms).map(async (target) => {
      const componentData = await componentSlice.fetchComponentPageSlice(
        target.context,
        [target.context.platform],
      );
      const available = target.context.platform === 'web'
        ? componentData : componentData?.[target.context.platform];
      return available ? target : null;
    }),
  )).filter(Boolean);
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
