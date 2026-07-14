/**
 * Loads a 2nd-gen SWC component from the esm.sh CDN and registers it.
 *
 * esm.sh is a *rewriting* CDN: it resolves the bare specifiers
 * (`import "lit"`, `@spectrum-web-components/core/...`) in the published
 * modules that a raw CDN (unpkg / jsDelivr-raw) would leave unresolvable. The
 * version is pinned in the URL, so there is no local vendoring to maintain.
 *
 * A module often ships a whole family: `components/tabs` exports `Tabs`, `Tab`,
 * and `TabPanel`; `components/accordion` exports `Accordion` and
 * `AccordionItem`. So the tag → module map below is many-to-one, and importing
 * one module registers every element class it exports (each tag derived from
 * the PascalCase export name). Some pattern modules auto-register on import; the
 * `registry.get` guard makes the explicit define a no-op in that case.
 *
 * `swc-color-loupe` is a known exception: `components/color-loupe` fails to load
 * from the CDN (a bug in the published dependency graph). Its shell surfaces the
 * load failure until that's fixed upstream or the one component is vendored.
 */
export const BASE = 'https://esm.sh/@adobe/spectrum-wc@0.3.0';

export const MODULES = {
  // components/* — standard components (some are families)
  accordion: 'components/accordion',
  'accordion-item': 'components/accordion',
  'action-button': 'components/action-button',
  asset: 'components/asset',
  avatar: 'components/avatar',
  badge: 'components/badge',
  button: 'components/button',
  'button-group': 'components/button-group',
  'color-loupe': 'components/color-loupe',
  divider: 'components/divider',
  icon: 'components/icon',
  'illustrated-message': 'components/illustrated-message',
  meter: 'components/meter',
  'progress-circle': 'components/progress-circle',
  'status-light': 'components/status-light',
  tab: 'components/tabs',
  'tab-panel': 'components/tabs',
  tabs: 'components/tabs',
  tooltip: 'components/tooltip',
  // patterns/conversational-ai/* — note swc-suggestion-group ships from `suggestion`
  'conversation-thread': 'patterns/conversational-ai/conversation-thread',
  'conversation-turn': 'patterns/conversational-ai/conversation-turn',
  'message-feedback': 'patterns/conversational-ai/message-feedback',
  'message-sources': 'patterns/conversational-ai/message-sources',
  'prompt-field': 'patterns/conversational-ai/prompt-field',
  'response-status': 'patterns/conversational-ai/response-status',
  'suggestion-group': 'patterns/conversational-ai/suggestion',
  'suggestion-item': 'patterns/conversational-ai/suggestion-item',
  'system-message': 'patterns/conversational-ai/system-message',
  'upload-artifact': 'patterns/conversational-ai/upload-artifact',
  'user-message': 'patterns/conversational-ai/user-message',
};

// PascalCase export name -> custom element tag, e.g. TabPanel -> swc-tab-panel.
export const tagFor = (exportName) => `swc-${exportName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

/**
 * Register every custom-element class a module namespace exports, deriving each
 * tag from its export name. Guarded so a module that already auto-registered (or
 * a family member defined by an earlier call) doesn't trip "already used with
 * this registry". Returns the tags it saw. `registry` is injectable for tests.
 */
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

/**
 * Import the module that owns `swc-<component>` and register its elements.
 * `load` is injectable so tests can exercise the resolution logic without the
 * network. Resolves to the registered tag name.
 */
export async function defineSwc(component, load = (url) => import(url)) {
  const tagName = `swc-${component}`;
  if (customElements.get(tagName)) { return tagName; }

  const subpath = MODULES[component];
  if (!subpath) { throw new Error(`Unknown SWC component: ${tagName}`); }

  const mod = await load(`${BASE}/${subpath}`);
  registerElements(mod);

  if (!customElements.get(tagName)) {
    throw new Error(`SWC module ${subpath} did not provide ${tagName}`);
  }
  return tagName;
}
