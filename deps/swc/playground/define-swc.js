// esm.sh resolves bare specifiers a raw CDN (unpkg/jsDelivr-raw) can't.
// `swc-color-loupe` is a known exception — components/color-loupe fails to
// load from the CDN (upstream bug); its shell surfaces the load failure.
export const BASE = 'https://esm.sh/@adobe/spectrum-wc@0.3.0';

// Many-to-one: a module often ships a whole family (components/tabs exports
// Tabs, Tab, TabPanel), so importing one module registers every tag it owns.

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

  const subpath = MODULES[component];
  if (!subpath) { throw new Error(`Unknown SWC component: ${tagName}`); }

  const mod = await load(`${BASE}/${subpath}`);
  registerElements(mod);

  if (!customElements.get(tagName)) {
    throw new Error(`SWC module ${subpath} did not provide ${tagName}`);
  }
  return tagName;
}
