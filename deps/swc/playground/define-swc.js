// COMPONENTS maps each component name to the esm.sh module subpath it
// ships from. It's a generated artifact (deps/swc/discover-components.js derives
// it from the published CEM) — the single source of truth for both which tags
// exist and where each tag's module lives.
import COMPONENTS from '../components.json' with { type: 'json' };

// The concrete version `@beta` resolved to as of the last daily extraction run
// (deps/swc/extract-cem-components.js writes this file) — not a live `@beta`
// tag read here directly, so this never drifts from what components.json/data
// were actually extracted from (a hardcoded stale pin caused exactly that: an
// old 0.3.0 pin predated progress-bar). Refreshed automatically every day;
// never hand-edit.
import VERSION_INFO from '../version.json' with { type: 'json' };

export const VERSION = VERSION_INFO.version;
export const BASE = `https://esm.sh/@adobe/spectrum-wc@${VERSION}`;

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
