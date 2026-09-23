import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

import '../../blocks/search/search.js';
import { resetNavAreasCacheForTests } from '../../blocks/search/nav-areas.js';
import { SEARCH_ANNOUNCE_EVENT } from '../../scripts/utils/nav-events.js';

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

    it('forwards role, aria-label, aria-expanded, aria-autocomplete, and autocomplete', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      expect(input.getAttribute('role')).to.equal('combobox');
      expect(input.getAttribute('aria-label')).to.equal('Search');
      expect(input.getAttribute('aria-expanded')).to.equal('true');
      expect(input.getAttribute('aria-autocomplete')).to.equal('list');
      expect(input.getAttribute('autocomplete')).to.equal('off');
    });

    it("labels the listbox by view: 'Navigation areas' before typing, 'Search results' after", async () => {
      const el = await mountSearch(sandbox);
      expect(el.shadowRoot.querySelector('#listbox').getAttribute('aria-label')).to.equal('Navigation areas');

      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button' }];
      await el.updateComplete;

      expect(el.shadowRoot.querySelector('#listbox').getAttribute('aria-label')).to.equal('Search results');
    });

    it('points aria-controls at the listbox via an element reference', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      const listbox = el.shadowRoot.querySelector('#listbox');
      const controlsElements = [...input.ariaControlsElements];
      expect(controlsElements.length === 1 && controlsElements[0] === listbox).to.be.true;
    });

    it('describes the native input with search usage instructions', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      const instruction = el.shadowRoot.querySelector('#search-instructions');

      expect(instruction.textContent.trim()).to.equal(
        'Type to search, or use the Up and Down Arrow keys to navigate. Press Enter to select.',
      );
      expect(input.ariaDescribedByElements).to.deep.equal([instruction]);
    });

    it('points aria-activedescendant at the active option via an element reference', async () => {
      const el = await mountSearch(sandbox);
      const input = realInput(el);
      const active = el.shadowRoot.querySelector('#result-0');
      expect(input.ariaActiveDescendantElement === active).to.be.true;
    });

    it('synchronously reflects the first ArrowDown option on the native input', async () => {
      const el = await mountSearch(sandbox);
      const seInput = el.shadowRoot.querySelector('se-input');
      const input = realInput(el);
      sandbox.stub(seInput, 'requestUpdate');

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
      }));
      await el.updateComplete;

      const foundations = el.shadowRoot.querySelector('#result-1');
      expect(foundations.getAttribute('aria-selected')).to.equal('true');
      expect(input.ariaActiveDescendantElement).to.equal(foundations);
    });

    it('submits the search form on Enter when no option is active', async () => {
      const el = await mountSearchWithFailedFetch(sandbox);
      const input = realInput(el);
      const form = el.shadowRoot.querySelector('form');
      const submitSpy = sinon.spy();
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitSpy(event);
      });

      expect(input.ariaActiveDescendantElement === null).to.be.true;
      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }));

      expect(submitSpy.calledOnce).to.be.true;
    });
  });

  describe('moving focus into the input on open', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    });

    afterEach(() => {
      clock.restore();
    });

    it('moves real focus onto the innermost <input>, three shadow roots deep', async () => {
      const el = await mountSearch(sandbox);

      // firstUpdated() defers the real focus() call via two chained rAFs.
      // tickAsync(0) doesn't reach a faked rAF's scheduled frame boundary —
      // nextAsync() fires whatever's next regardless of timer type.
      await clock.nextAsync();
      await clock.nextAsync();

      const seInput = el.shadowRoot.querySelector('se-input');
      const realInput = seInput.shadowRoot.querySelector('input');
      expect(document.activeElement === el).to.be.true;
      expect(el.shadowRoot.activeElement === seInput).to.be.true;
      expect(seInput.shadowRoot.activeElement === realInput).to.be.true;
    });
  });

  describe('Safari announcements', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      sandbox.stub(navigator, 'vendor').value('Apple Computer, Inc.');
      sandbox.stub(navigator, 'userAgent').value(
        'Mozilla/5.0 Version/18.0 Safari/605.1.15',
      );
    });

    afterEach(() => {
      clock.restore();
    });

    it('announces usage guidance and the first option after focusing', async () => {
      const el = await mountSearch(sandbox);
      const announcementSpy = sinon.spy();
      el.addEventListener(SEARCH_ANNOUNCE_EVENT, announcementSpy);

      await clock.nextAsync();
      await clock.nextAsync();

      expect(announcementSpy.calledOnce).to.be.true;
      expect(announcementSpy.firstCall.args[0].detail.message).to.equal(
        'Type to search, or use the Up and Down Arrow keys to navigate. '
        + 'Press Enter to select. Getting started.',
      );
    });
  });

  describe('option/listbox structure', () => {
    it('puts role="option" on the interactive row (not the <li>) in nav view', async () => {
      const el = await mountSearch(sandbox);
      const li = el.shadowRoot.querySelector('.results-list > li');
      const row = li.querySelector('.result-row');

      expect(li.getAttribute('role')).to.equal('presentation');
      expect(row.getAttribute('role')).to.equal('option');
      expect(row.tagName).to.equal('BUTTON');
    });

    it('puts role="option" on the interactive row (not the <li>) in results view', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button', url: '/a' }];
      await el.updateComplete;

      const li = el.shadowRoot.querySelector('.results-list > li');
      const row = li.querySelector('.result-row');

      expect(li.getAttribute('role')).to.equal('presentation');
      expect(row.getAttribute('role')).to.equal('option');
      expect(row.tagName).to.equal('A');
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
      const active = el.shadowRoot.querySelector('[aria-selected="true"]');
      expect(active === el.shadowRoot.querySelector('#result-0')).to.be.true;
    });

    it('ArrowDown wraps from the last option to the first', async () => {
      const el = await mountSearch(sandbox);
      await dispatchKey(el, 'ArrowDown'); // -> index 1 (last)
      await dispatchKey(el, 'ArrowDown'); // -> wraps to index 0
      const active = el.shadowRoot.querySelector('[aria-selected="true"]');
      expect(active === el.shadowRoot.querySelector('#result-0')).to.be.true;
    });

    it('ArrowUp wraps from the first option to the last', async () => {
      const el = await mountSearch(sandbox);
      await dispatchKey(el, 'ArrowUp'); // -> wraps to index 1 (last)
      const active = el.shadowRoot.querySelector('[aria-selected="true"]');
      expect(active === el.shadowRoot.querySelector('#result-1')).to.be.true;
    });

    it('sets aria-selected="true" on only the active option', async () => {
      const el = await mountSearch(sandbox);
      const options = [...el.shadowRoot.querySelectorAll('[role="option"]')];
      expect(options.map((o) => o.getAttribute('aria-selected'))).to.deep.equal(['true', 'false']);
    });

    it('announces the newly active option after every arrow key in Safari', async () => {
      sandbox.stub(navigator, 'vendor').value('Apple Computer, Inc.');
      sandbox.stub(navigator, 'userAgent').value(
        'Mozilla/5.0 Version/18.0 Safari/605.1.15',
      );
      const el = await mountSearch(sandbox);
      const announcementSpy = sinon.spy();
      el.addEventListener(SEARCH_ANNOUNCE_EVENT, announcementSpy);

      await dispatchKey(el, 'ArrowDown');
      await dispatchKey(el, 'ArrowUp');

      expect(announcementSpy.callCount).to.equal(2);
      expect(announcementSpy.firstCall.args[0].detail.message).to.equal('Foundations');
      expect(announcementSpy.secondCall.args[0].detail.message).to.equal('Getting started');
    });

    it('does not add live announcements when active-descendant speech is supported', async () => {
      const el = await mountSearch(sandbox);
      const announcementSpy = sinon.spy();
      el.addEventListener(SEARCH_ANNOUNCE_EVENT, announcementSpy);

      await dispatchKey(el, 'ArrowDown');

      expect(announcementSpy.called).to.be.false;
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

      const input = el.shadowRoot.querySelector('se-input').shadowRoot.querySelector('input');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
      await el.updateComplete;
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      });
      input.dispatchEvent(enterEvent);

      expect(spy.calledOnce).to.be.true;
      expect(spy.firstCall.args[0].detail.label).to.equal('Foundations');
      expect(spy.firstCall.args[0].detail.sourceEvent === enterEvent).to.be.true;
      document.removeEventListener('sitenav:expand-level1', spy);
    });
  });

  describe('typing', () => {
    it('submits safely when Enter is pressed before typed results arrive', async () => {
      const el = await mountSearch(sandbox);
      const runSearch = sandbox.stub(el, '_runSearch').resolves();
      const input = el.shadowRoot.querySelector('se-input').shadowRoot.querySelector('input');
      const clearSpy = sinon.spy();
      el.addEventListener('clear', clearSpy);

      input.value = 'button';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));

      expect(input.ariaActiveDescendantElement === null).to.be.true;
      expect(() => input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
      }))).not.to.throw();
      expect(runSearch.calledOnce).to.be.true;
      expect(clearSpy.called).to.be.false;
    });

    it('ignores a search response after the query changes', async () => {
      const el = await mountSearch(sandbox);
      let resolveSearch;
      sandbox.stub(el, '_search').returns(new Promise((resolve) => {
        resolveSearch = resolve;
      }));
      el.query = 'but';
      const staleSearch = el._runSearch();

      const currentResults = [{ objectID: '/button', title: 'Button', url: '/button' }];
      el.query = 'button';
      el.results = currentResults;
      resolveSearch([{ objectID: '/but', title: 'Stale result', url: '/but' }]);
      await staleSearch;

      expect(el.results).to.equal(currentResults);
    });

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

  describe('selecting a result', () => {
    it('closes (dispatches clear) after selecting the active result with Enter', async () => {
      const el = await mountSearch(sandbox);
      sandbox.stub(window, 'open');
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button', url: '/a' }];
      await el.updateComplete;

      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      el.shadowRoot.querySelector('se-input').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
      );

      expect(spy.calledOnce).to.be.true;
    });

    it('closes (dispatches clear) after clicking a result', async () => {
      const el = await mountSearch(sandbox);
      el.query = 'button';
      el.results = [{ objectID: '/a', title: 'Button', url: '/a' }];
      await el.updateComplete;

      const spy = sinon.spy();
      el.addEventListener('clear', spy);
      const anchor = el.shadowRoot.querySelector('.hit-title').closest('a');
      // Prevent the real navigation a genuine click on this href would trigger.
      anchor.addEventListener('click', (e) => e.preventDefault(), { once: true });
      anchor.click();

      expect(spy.calledOnce).to.be.true;
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
