import { pascalCase } from '../../deps/rsp/playground/pascal-case.js';

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

export function resolveImplementation(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('components');
  if (idx < 1) { return null; }
  const impl = IMPLEMENTATIONS[parts[idx - 1]];
  const component = parts[idx + 1];
  if (!impl || !component) { return null; }
  return { label: impl.label, href: impl.href(component) };
}

//  if the page has no resolvable implementation the widget removes itself.
export function decorateGoToImpl(a, span) {
  const target = resolveImplementation(window.location.pathname);
  if (!target) {
    a.remove();
    return;
  }
  a.href = target.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  span.textContent = `Go to ${target.label}`;
}
