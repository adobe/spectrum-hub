import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  BASE,
  MODULES,
  tagFor,
  registerElements,
  defineSwc,
} from '../../deps/swc/playground/define-swc.js';

const SHELL_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../deps/swc/playground/snippets');

// A minimal stand-in for the browser custom element registry.
function fakeRegistry() {
  const defined = new Map();
  return {
    defined,
    get: (tag) => defined.get(tag),
    define: (tag, ctor) => {
      if (defined.has(tag)) { throw new Error(`already defined: ${tag}`); }
      defined.set(tag, ctor);
    },
  };
}

// define-swc.js is browser code that reads the global HTMLElement +
// customElements at call time; stub them so these node tests can drive it.
// defineSwc tests reassign globalThis.customElements to a fresh fake per test.
globalThis.HTMLElement ??= class HTMLElement {};
globalThis.customElements ??= fakeRegistry();

const makeElement = () => class extends globalThis.HTMLElement {};

describe('tagFor', () => {
  it('kebab-cases PascalCase export names into swc-* tags', () => {
    assert.equal(tagFor('Button'), 'swc-button');
    assert.equal(tagFor('TabPanel'), 'swc-tab-panel');
    assert.equal(tagFor('ButtonGroup'), 'swc-button-group');
    assert.equal(tagFor('ProgressCircle'), 'swc-progress-circle');
    assert.equal(tagFor('ConversationThread'), 'swc-conversation-thread');
    assert.equal(tagFor('AccordionItem'), 'swc-accordion-item');
  });
});

describe('MODULES map — tricky groupings', () => {
  it('groups the tabs family into one module', () => {
    assert.equal(MODULES.tabs, 'components/tabs');
    assert.equal(MODULES.tab, 'components/tabs');
    assert.equal(MODULES['tab-panel'], 'components/tabs');
  });

  it('groups the accordion family into one module', () => {
    assert.equal(MODULES.accordion, 'components/accordion');
    assert.equal(MODULES['accordion-item'], 'components/accordion');
  });

  it('maps swc-suggestion-group to the `suggestion` module (name diverges from tag)', () => {
    assert.equal(MODULES['suggestion-group'], 'patterns/conversational-ai/suggestion');
  });

  it('keeps suggestion-item as its own module (not folded into suggestion)', () => {
    assert.equal(MODULES['suggestion-item'], 'patterns/conversational-ai/suggestion-item');
  });

  it('routes the conversational-ai family under patterns/conversational-ai', () => {
    for (const tag of ['conversation-thread', 'conversation-turn', 'user-message', 'system-message']) {
      assert.match(MODULES[tag], /^patterns\/conversational-ai\//, `${tag} should be a pattern`);
    }
  });
});

describe('MODULES map — completeness vs. shells', () => {
  // Every defineSwc('X') call across the static shells must have a map entry,
  // otherwise that shell fails at runtime. This is the primary regression guard
  // for adding a shell (or a sub-component import) without wiring the map.
  const shells = readdirSync(SHELL_DIR).filter((f) => f.endsWith('.html'));
  const callRe = /defineSwc\('([a-z0-9-]+)'\)/g;

  for (const shell of shells) {
    it(`every defineSwc() arg in ${shell} is mapped`, () => {
      const src = readFileSync(join(SHELL_DIR, shell), 'utf8');
      const names = [...src.matchAll(callRe)].map((m) => m[1]);
      for (const name of names) {
        assert.ok(MODULES[name], `defineSwc('${name}') in ${shell} has no MODULES entry`);
      }
    });
  }

  it('every mapped component has a per-component shell', () => {
    // Catches a map entry that no longer corresponds to a real shell page.
    const hasShell = (name) => shells.includes(`${name}.html`);
    const missing = Object.keys(MODULES).filter((name) => !hasShell(name));
    assert.deepEqual(missing, [], `mapped components without a shell: ${missing.join(', ')}`);
  });
});

describe('registerElements', () => {
  it('registers every element export, deriving the tag from its name', () => {
    const registry = fakeRegistry();
    const mod = { Tabs: makeElement(), Tab: makeElement(), TabPanel: makeElement() };
    const tags = registerElements(mod, registry);
    assert.deepEqual(tags.sort(), ['swc-tab', 'swc-tab-panel', 'swc-tabs']);
    assert.ok(registry.get('swc-tab-panel'));
  });

  it('ignores non-element exports (constants, plain functions)', () => {
    const registry = fakeRegistry();
    const mod = { VERSION: '1.0.0', helper: () => {}, Button: makeElement() };
    assert.deepEqual(registerElements(mod, registry), ['swc-button']);
  });

  it('guards against re-defining an already-registered tag', () => {
    const registry = fakeRegistry();
    registry.define('swc-icon', makeElement()); // e.g. auto-registered sub-dep
    const mod = { Icon: makeElement() };
    assert.doesNotThrow(() => registerElements(mod, registry));
    assert.equal(registry.defined.size, 1);
  });
});

describe('defineSwc', () => {
  it('throws on an unknown component before importing', async () => {
    let loaded = false;
    await assert.rejects(
      defineSwc('not-a-real-component', () => { loaded = true; return Promise.resolve({}); }),
      /Unknown SWC component: swc-not-a-real-component/,
    );
    assert.equal(loaded, false, 'should not attempt a load for an unmapped component');
  });

  it('imports the mapped module and registers the requested tag', async () => {
    globalThis.customElements = fakeRegistry();
    const load = (url) => {
      assert.equal(url, `${BASE}/${MODULES.button}`);
      return Promise.resolve({ Button: makeElement() });
    };
    const tag = await defineSwc('button', load);
    assert.equal(tag, 'swc-button');
    assert.ok(globalThis.customElements.get('swc-button'));
  });

  it('throws when the module does not provide the requested tag', async () => {
    globalThis.customElements = fakeRegistry();
    // suggestion module ships SuggestionGroup, not a bare `suggestion` element.
    const load = () => Promise.resolve({ SuggestionGroup: makeElement() });
    await assert.rejects(
      defineSwc('suggestion-item', load),
      /did not provide swc-suggestion-item/,
    );
  });
});
