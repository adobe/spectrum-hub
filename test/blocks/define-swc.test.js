import { expect } from '@esm-bundle/chai';
import {
  BASE,
  VERSION,
  COMPONENTS,
  tagFor,
  registerElements,
  defineSwc,
} from '../../deps/swc/playground/define-swc.js';

// define-swc.js statically imports components.json as a JSON module, which only
// resolves in a browser (and on Node >= 20.10). It runs for real only in the
// playground, so these tests run in the browser test runner — never node --test.

// A minimal stand-in for the custom element registry, so registerElements can
// be exercised without touching the page's real customElements.
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

const makeElement = () => class extends HTMLElement {};

describe('BASE', () => {
  // VERSION is deps/swc/version.json — the concrete release the last daily
  // extraction run resolved `@beta` to (see extract-cem-components.js), not a
  // live `@beta` tag read here — so BASE never drifts from what
  // components.json/data were actually extracted from.
  it('is built from the committed VERSION, not a live @beta tag', () => {
    expect(VERSION).to.be.a('string').with.length.greaterThan(0);
    expect(BASE).to.equal(`https://esm.sh/@adobe/spectrum-wc@${VERSION}`);
    expect(BASE).to.not.include('@beta');
  });
});

describe('tagFor', () => {
  it('kebab-cases PascalCase export names into swc-* tags', () => {
    expect(tagFor('Button')).to.equal('swc-button');
    expect(tagFor('TabPanel')).to.equal('swc-tab-panel');
    expect(tagFor('ButtonGroup')).to.equal('swc-button-group');
    expect(tagFor('ProgressCircle')).to.equal('swc-progress-circle');
    expect(tagFor('ConversationThread')).to.equal('swc-conversation-thread');
    expect(tagFor('AccordionItem')).to.equal('swc-accordion-item');
  });
});

describe('registerElements', () => {
  it('registers every element export, deriving the tag from its name', () => {
    const registry = fakeRegistry();
    const mod = { Tabs: makeElement(), Tab: makeElement(), TabPanel: makeElement() };
    const tags = registerElements(mod, registry);
    expect(tags.sort()).to.deep.equal(['swc-tab', 'swc-tab-panel', 'swc-tabs']);
    expect(registry.get('swc-tab-panel')).to.be.ok;
  });

  it('ignores non-element exports (constants, plain functions)', () => {
    const registry = fakeRegistry();
    const mod = { VERSION: '1.0.0', helper: () => {}, Button: makeElement() };
    expect(registerElements(mod, registry)).to.deep.equal(['swc-button']);
  });

  it('guards against re-defining an already-registered tag', () => {
    const registry = fakeRegistry();
    registry.define('swc-icon', makeElement()); // e.g. auto-registered sub-dep
    const mod = { Icon: makeElement() };
    expect(() => registerElements(mod, registry)).to.not.throw();
    expect(registry.defined.size).to.equal(1);
  });
});

describe('defineSwc', () => {
  // defineSwc registers against the page's real customElements, so each test
  // uses tags nothing else defines to avoid cross-test collisions.
  it('throws on an unknown component before importing', async () => {
    let loaded = false;
    let err;
    const load = () => {
      loaded = true;
      return Promise.resolve({});
    };
    try {
      await defineSwc('not-a-real-component', load);
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/Unknown SWC component: swc-not-a-real-component/);
    expect(loaded, 'should not attempt a load for an unmapped component').to.equal(false);
  });

  it('imports the mapped module and registers the requested tag', async () => {
    const load = (url) => {
      expect(url).to.equal(`${BASE}/${COMPONENTS.button}`);
      return Promise.resolve({ Button: makeElement() });
    };
    const tag = await defineSwc('button', load);
    expect(tag).to.equal('swc-button');
    expect(customElements.get('swc-button')).to.be.ok;
  });

  it('throws when the module does not provide the requested tag', async () => {
    // suggestion module ships SuggestionGroup, not a bare `suggestion` element.
    const load = () => Promise.resolve({ SuggestionGroup: makeElement() });
    let err;
    try {
      await defineSwc('suggestion-item', load);
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/did not provide swc-suggestion-item/);
  });
});
