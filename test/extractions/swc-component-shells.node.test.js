import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Reads the generated components.json directly (rather than importing
// define-swc.js) so it stays a plain node --test: define-swc.js imports the
// JSON as a module, which does not resolve on this repo's Node version.
const SWC_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../deps/swc');
const SHELL_DIR = join(SWC_DIR, 'playground/snippets');
const COMPONENTS = JSON.parse(readFileSync(join(SWC_DIR, 'components.json'), 'utf8'));

describe('components.json — tricky groupings (generated from the CEM)', () => {
  it('groups the tabs family into one module', () => {
    assert.equal(COMPONENTS.tabs, 'components/tabs');
    assert.equal(COMPONENTS.tab, 'components/tabs');
    assert.equal(COMPONENTS['tab-panel'], 'components/tabs');
  });

  it('groups the accordion family into one module', () => {
    assert.equal(COMPONENTS.accordion, 'components/accordion');
    assert.equal(COMPONENTS['accordion-item'], 'components/accordion');
  });

  it('maps swc-suggestion-group to the `suggestion` module (name diverges from tag)', () => {
    assert.equal(COMPONENTS['suggestion-group'], 'patterns/conversational-ai/suggestion');
  });

  it('keeps suggestion-item as its own module (not folded into suggestion)', () => {
    assert.equal(COMPONENTS['suggestion-item'], 'patterns/conversational-ai/suggestion-item');
  });

  it('routes the conversational-ai family under patterns/conversational-ai', () => {
    for (const tag of ['conversation-thread', 'conversation-turn', 'user-message', 'system-message']) {
      assert.match(COMPONENTS[tag], /^patterns\/conversational-ai\//, `${tag} should be a pattern`);
    }
  });
});

describe('components.json — completeness vs. shells', () => {
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
        assert.ok(COMPONENTS[name], `defineSwc('${name}') in ${shell} has no components.json entry`);
      }
    });
  }

  it('every mapped component has a per-component shell', () => {
    // Catches a map entry that no longer corresponds to a real shell page.
    const hasShell = (name) => shells.includes(`${name}.html`);
    const missing = Object.keys(COMPONENTS).filter((name) => !hasShell(name));
    assert.deepEqual(missing, [], `mapped components without a shell: ${missing.join(', ')}`);
  });
});
