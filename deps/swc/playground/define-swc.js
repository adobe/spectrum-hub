// COMPONENTS maps each component name to the esm.sh module subpath it
// ships from. It's a generated artifact (deps/swc/discover-components.js derives
// it from the published CEM) — the single source of truth for both which tags
// exist and where each tag's module lives.
import COMPONENTS from '../components.json' with { type: 'json' };

// `@beta` matches the dist-tag extract-cem-components.js pulls the CEM
// from — components.json/data would drift from what's actually loadable
// here if this pinned an older release (e.g. 0.3.0 predates progress-bar).
export const BASE = 'https://esm.sh/@adobe/spectrum-wc@beta';

export { COMPONENTS };

// PascalCase export name -> custom element tag, e.g. TabPanel -> swc-tab-panel.
export const tagFor = (exportName) => `swc-${exportName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

// Guarded so an already-registered tag (auto-registered, or an earlier family
// member) doesn't trip "already used with this registry".
export function registerElements(mod, registry = customElements) {
  const tags = [];
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === 'function' && value.prototype instanceof HTMLElement) {
      const tag = tagFor(name);
      if (!registry.get(tag)) { registry.define(tag, value); }
      tags.push(tag);
    }
  }
  return tags;
}

// `load` is injectable so tests can exercise this without the network.
export async function defineSwc(component, load = (url) => import(url)) {
  const tagName = `swc-${component}`;
  if (customElements.get(tagName)) { return tagName; }

  const subpath = COMPONENTS[component];
  if (!subpath) { throw new Error(`Unknown SWC component: ${tagName}`); }

  const mod = await load(`${BASE}/${subpath}`);
  registerElements(mod);

  if (!customElements.get(tagName)) {
    throw new Error(`SWC module ${subpath} did not provide ${tagName}`);
  }
  return tagName;
}
