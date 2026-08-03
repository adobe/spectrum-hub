import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';
import { getConfig } from '../ak.js';

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

/** `ActionButton` -> `action-button` (mirrors deps/build-status-index.js's toSlug). */
const toSlug = (name) => name
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  .toLowerCase();

/** `originalName` overrides the URL slug when the upstream docs site uses a different name. */
export function resolveImplementation(pathname, originalName) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return null; }
  const impl = IMPLEMENTATIONS[parts[idx - 1]];
  const slug = parts[idx + 1];
  if (!impl || !slug) { return null; }
  const component = originalName ? toSlug(originalName) : slug;
  return { label: impl.label, href: impl.href(component) };
}

/** The URL's impl segment (`rsp`/`swc`) and component slug, or both null. */
function implAndSlugFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return { impl: null, slug: null }; }
  return { impl: parts[idx - 1] ?? null, slug: parts[idx + 1] ?? null };
}

/** Fetches the current page's status slice for its impl cell's `originalName`, or null. */
async function fetchOriginalName(slug, impl) {
  const { codeBase = '' } = getConfig();
  try {
    const resp = await fetch(`${codeBase}/deps/status/${slug}.json`);
    if (!resp.ok) { return null; }
    const data = await resp.json();
    return data.web?.[impl]?.originalName ?? null;
  } catch {
    return null;
  }
}

//  if the page has no resolvable implementation the widget removes itself.
export async function decorateGoToImpl(a, span) {
  const { pathname } = window.location;
  const { impl, slug } = implAndSlugFromPath(pathname);
  const originalName = (impl && slug) ? await fetchOriginalName(slug, impl) : null;
  const target = resolveImplementation(pathname, originalName);
  if (!target) {
    a.remove();
    return;
  }
  a.href = target.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = `Go to ${target.label}`;
}
