import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import '../../blocks/search/search.js';
import { resetNavAreasCacheForTests } from '../../blocks/search/nav-areas.js';

const NAV_HTML = `<body><header></header><main><div><ul>
  <li><p>Getting started</p><ul><li><a href="/a">a</a></li></ul></li>
  <li><p>Foundations</p><ul><li><a href="/b">b</a></li></ul></li>
</ul></div></main></body>`;

async function mountSearchWithResponse(sandbox, response) {
  sandbox.stub(window, 'fetch').resolves(response);
  const el = document.createElement('sh-search');
  document.body.append(el);
  await el.updateComplete;
  await new Promise((resolve) => { setTimeout(resolve); }); // let fetchNavAreas resolve
  await el.updateComplete;
  return el;
}

function mountSearch(sandbox) {
  return mountSearchWithResponse(sandbox, new Response(NAV_HTML, { status: 200 }));
}

function mountSearchWithFailedFetch(sandbox) {
  return mountSearchWithResponse(sandbox, new Response('', { status: 404 }));
}

describe('sh-search', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetNavAreasCacheForTests();
  });

  afterEach(() => {
    document.querySelectorAll('sh-search').forEach((el) => el.remove());
    sandbox.restore();
  });

  describe('nav-area view', () => {
    it('shows the level-1 nav areas before the user types anything', async () => {
      const el = await mountSearch(sandbox);
      const titles = [...el.shadowRoot.querySelectorAll('.hit-title')].map((n) => n.textContent);
      expect(titles).to.deep.equal(['Getting started', 'Foundations']);
    });

    it("shows each area's description", async () => {
      const el = await mountSearch(sandbox);
      const first = el.shadowRoot.querySelector('.hit-description');
      expect(first.textContent).to.equal('Introduction, principles, and how to begin');
    });

    it('does not render a results-count heading in nav view', async () => {
      const el = await mountSearch(sandbox);
      // Compared as a boolean, not via chai's .to.equal(null): a live DOM
      // node on the "actual" side of a failed equality assertion makes chai
      // serialize it for the diff, which can hang/crash the test runner.
      expect(el.shadowRoot.querySelector('.results-heading') === null).to.be.true;
    });
  });

  describe('combobox semantics reach the real <input>', () => {
    // se-input has its own shadow root; role/aria-*/autocomplete set on the
    // <se-input> tag only matter if se-input forwards them onto the native
    // <input> inside it.
    function realInput(el) {
      return el.shadowRoot.querySelector('se-input').shadowRoot.querySelector('input');
    }

    it('forwards role, aria-label, aria-expanded, and autocomplete', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      expect(input.getAttribute('role')).to.equal('combobox');
      expect(input.getAttribute('aria-label')).to.equal('Search');
      expect(input.getAttribute('aria-expanded')).to.equal('true');
      expect(input.getAttribute('autocomplete')).to.equal('off');
    });

    it('points aria-controls at the listbox via an element reference', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      const listbox = el.shadowRoot.querySelector('#listbox');
      expect([...input.ariaControlsElements]).to.deep.equal([listbox]);
    });

    it('points aria-activedescendant at the active option via an element reference', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      const active = el.shadowRoot.querySelector('#result-0');
      expect(input.ariaActiveDescendantElement).to.equal(active);
    });

    it('moves aria-activedescendant when the active option changes', async () => {
      const el = await mountSearch(sandbox);
      el.shadowRoot.querySelector('se-input').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
      );
      await el.updateComplete;

      const input = realInput(el);
      const active = el.shadowRoot.querySelector('#result-1');
      expect(input.ariaActiveDescendantElement).to.equal(active);
    });
  });

  describe('arrow-key navigation', () => {
    function dispatchKey(el, key) {
      el.shadowRoot.querySelector('se-input').dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, composed: true }),
      );
      return el.updateComplete;
    }

    it('ArrowUp moves the active option backward', async () => {
      const el = await mountSearch(sandbox);
      await dispatchKey(el, 'ArrowDown'); // -> index 1
      await dispatchKey(el, 'ArrowUp'); // -> index 0
      const active = el.shadowRoot.querySelector('li[aria-selected="true"]');
      expect(active).to.equal(el.shadowRoot.querySelector('#result-0'));
    });

    it('ArrowDown wraps from the last option to the first', async () => {
      const el = await mountSearch(sandbox);
      await dispatchKey(el, 'ArrowDown'); // -> index 1 (last)
      await dispatchKey(el, 'ArrowDown'); // -> wraps to index 0
      const active = el.shadowRoot.querySelector('li[aria-selected="true"]');
      expect(active).to.equal(el.shadowRoot.querySelector('#result-0'));
    });

    it('ArrowUp wraps from the first option to the last', async () => {
      const el = await mountSearch(sandbox);
      await dispatchKey(el, 'ArrowUp'); // -> wraps to index 1 (last)
      const active = el.shadowRoot.querySelector('li[aria-selected="true"]');
      expect(active).to.equal(el.shadowRoot.querySelector('#result-1'));
    });

    it('sets aria-selected="true" on only the active option', async () => {
      const el = await mountSearch(sandbox);
      const options = [...el.shadowRoot.querySelectorAll('li[role="option"]')];
      expect(options.map((o) => o.getAttribute('aria-selected'))).to.deep.equal(['true', 'false']);
    });
  });

  describe('nav areas fail to load', () => {
    it('shows an empty-state message instead of a blank popover', async () => {
      const el = await mountSearchWithFailedFetch(sandbox);
      const empty = el.shadowRoot.querySelector('.results-empty');
      expect(empty === null).to.be.false;
      expect(empty.textContent).to.equal('Navigation is unavailable right now.');
    });

    it('hides the keyboard-instruction footer since there is nothing to navigate', async () => {
      const el = await mountSearchWithFailedFetch(sandbox);
      expect(el.shadowRoot.querySelector('.results-popover-footer') === null).to.be.true;
    });
  });

  describe('selecting a nav area', () => {
    it('dispatches sitenav:expand-level1 with the area label', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      document.addEventListener('sitenav:expand-level1', spy);

      el.shadowRoot.querySelector('.hit-title').closest('button').click();

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0].detail.label).to.equal('Getting started');
      document.removeEventListener('sitenav:expand-level1', spy);
    });

    it('closes (dispatches clear) after selecting a nav area', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);

      el.shadowRoot.querySelector('.hit-title').closest('button').click();

      expect(spy.calledOnce).to.be.true;
    });

    it('Enter selects the active area, same as clicking it', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      document.addEventListener('sitenav:expand-level1', spy);

      const seInput = el.shadowRoot.querySelector('se-input');
      seInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
      await el.updateComplete;
      seInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0].detail.label).to.equal('Foundations');
      document.removeEventListener('sitenav:expand-level1', spy);
    });
  });

  describe('typing', () => {
    it('switches to results view once a query is entered', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button', implementation: 'RSP', platform: 'Web', tags: [] }];
      await el.updateComplete;

      expect(el.shadowRoot.querySelector('.results-heading') === null).to.be.false;
      expect(el.shadowRoot.querySelector('.hit-description') === null).to.be.true;
    });

    it('shows up to 2 pills, implementation first then platform, dropping the rest', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{
        objectID: '/a', title: 'Button', implementation: 'RSP', platform: 'Web', tags: ['container'],
      }];
      await el.updateComplete;

      const pills = [...el.shadowRoot.querySelectorAll('.tag-pill')].map((n) => n.textContent);
      expect(pills).to.deep.equal(['RSP', 'Web']);
    });

    it('falls back to platform and tags when implementation is missing', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{
        objectID: '/a', title: 'Button', implementation: '', platform: 'Mobile', tags: ['iOS', 'container'],
      }];
      await el.updateComplete;

      const pills = [...el.shadowRoot.querySelectorAll('.tag-pill')].map((n) => n.textContent);
      expect(pills).to.deep.equal(['Mobile', 'iOS']);
    });

    it('returns to nav-area view when the query is cleared', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button' }];
      await el.updateComplete;

      el.query = '';
      el.results = [];
      await el.updateComplete;

      const titles = [...el.shadowRoot.querySelectorAll('.hit-title')].map((n) => n.textContent);
      expect(titles).to.deep.equal(['Getting started', 'Foundations']);
    });
  });

  describe('closing', () => {
    it('closes and collapses on Escape', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);

      const input = el.shadowRoot.querySelector('se-input');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));

      expect(spy.calledOnce).to.be.true;
    });

    it('closes and collapses on an outside click', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      // outside-click listener registers a tick late
      await new Promise((resolve) => { setTimeout(resolve); });

      document.body.click();

      expect(spy.calledOnce).to.be.true;
    });

    it('does not close on a click inside the component', async () => {
      const el = await mountSearch(sandbox);
      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      await new Promise((resolve) => { setTimeout(resolve); });

      // Clicking a nav-area row itself is a selection, not a plain "inside"
      // click, and intentionally closes — so this targets the popover
      // footer instead, which has no click behavior of its own.
      el.shadowRoot.querySelector('.results-popover-footer').click();

      expect(spy.called).to.be.false;
    });
  });
});
