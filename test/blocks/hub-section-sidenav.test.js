import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
// The named import also evaluates the module, which registers the custom element.
import {
  getTopSection,
  formatLabel,
  fetchSectionTree,
} from '../../blocks/hub-section-sidenav/hub-section-sidenav.js';

const PAGES = [
  { path: '/foundations/color', title: 'Color' },
  { path: '/foundations/visual-language/typography', title: 'Typography' },
  { path: '/foundations/getting-started', title: null },
  { path: '/components/button', title: 'Button' },
];

const PLATFORM_PAGES = [
  { path: '/web', title: 'Web' },
  { path: '/web/overview', title: 'Overview' },
  { path: '/web/status-table', title: 'Status table' },
  { path: '/web/rsp', title: 'RSP' },
  { path: '/web/rsp/components/button', title: 'Button' },
  { path: '/web/swc', title: 'SWC' },
  { path: '/web/swc/components/button', title: 'Button' },
];

function stubMatchMedia(sandbox, isMobile = false) {
  return sandbox.stub(window, 'matchMedia').returns({
    matches: isMobile,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

function stubIndexFetch(sandbox, data = PAGES, ok = true) {
  return sandbox.stub(window, 'fetch').resolves({
    ok,
    json: () => Promise.resolve({ data }),
  });
}

// Re-render until `predicate` holds or we run out of ticks. Handles the async
// fetch → state → render chain in connectedCallback and event handlers.
async function flush(el, predicate) {
  for (let i = 0; i < 20; i += 1) {
    /* eslint-disable no-await-in-loop */
    await el.updateComplete;
    if (predicate()) { return; }
    await new Promise((r) => { setTimeout(r, 0); });
    /* eslint-enable no-await-in-loop */
  }
}

describe('hub-section-sidenav block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
  });

  describe('getTopSection', () => {
    it('returns the first path segment', () => {
      window.history.pushState({}, '', '/foundations/color');
      expect(getTopSection()).to.equal('foundations');
    });

    it('returns the segment for a section landing page', () => {
      window.history.pushState({}, '', '/foundations');
      expect(getTopSection()).to.equal('foundations');
    });

    it('returns null at the site root', () => {
      window.history.pushState({}, '', '/');
      expect(getTopSection()).to.be.null;
    });
  });

  describe('formatLabel', () => {
    it('capitalizes the first character', () => {
      expect(formatLabel('color')).to.equal('Color');
    });

    it('replaces hyphens with spaces', () => {
      expect(formatLabel('getting-started')).to.equal('Getting started');
    });

    it('returns the empty string unchanged', () => {
      expect(formatLabel('')).to.equal('');
    });
  });

  describe('fetchSectionTree', () => {
    beforeEach(() => stubIndexFetch(sandbox));

    it('returns only the pages within the requested section', async () => {
      const tree = await fetchSectionTree('foundations');
      const labels = tree.map((n) => n.label);
      expect(labels).to.not.include('Button');
    });

    it('builds a leaf node from a single child page', async () => {
      const tree = await fetchSectionTree('foundations');
      const color = tree.find((n) => n.path === '/foundations/color');
      expect(color).to.deep.equal({ path: '/foundations/color', label: 'Color', children: [] });
    });

    it('nests deeper pages under an intermediate node', async () => {
      const tree = await fetchSectionTree('foundations');
      const visual = tree.find((n) => n.path === '/foundations/visual-language');
      expect(visual.label).to.equal('Visual language');
      expect(visual.children).to.have.lengthOf(1);
      expect(visual.children[0]).to.deep.equal({
        path: '/foundations/visual-language/typography',
        label: 'Typography',
        children: [],
      });
    });

    it('falls back to a formatted label when a page has no title', async () => {
      const tree = await fetchSectionTree('foundations');
      const gettingStarted = tree.find((n) => n.path === '/foundations/getting-started');
      expect(gettingStarted.label).to.equal('Getting started');
    });

    it('returns null when no pages match the section', async () => {
      expect(await fetchSectionTree('nonexistent')).to.be.null;
    });

    it('returns null when the index request fails', async () => {
      sandbox.restore();
      stubIndexFetch(sandbox, PAGES, false);
      expect(await fetchSectionTree('foundations')).to.be.null;
    });
  });

  describe('rendering', () => {
    it('renders nothing when there is no section tree (site root)', async () => {
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await el.updateComplete;
      expect(el.shadowRoot.querySelector('nav')).to.be.null;
    });

    it('auto-loads the current section tree on connect', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await flush(el, () => el.shadowRoot.querySelector('hub-sidenav-item'));
      expect(el.shadowRoot.querySelector('nav')).to.not.be.null;
      // Two top-level nodes: color (leaf) and visual-language (branch).
      expect(el.shadowRoot.querySelectorAll('hub-sidenav-item[data-nested="1"]')).to.have.lengthOf(3);
    });

    it('renders the top-level section header for platform pages', async () => {
      window.history.pushState({}, '', '/web/rsp/components/button');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox, PLATFORM_PAGES);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);

      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav__section-header'));

      expect(el.shadowRoot.querySelector('.hub-section-sidenav__section-header').textContent.trim()).to.equal('Web');
    });

    it('renders authored subgroup headers for direct branch nodes', async () => {
      window.history.pushState({}, '', '/web/rsp/components/button');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox, PLATFORM_PAGES);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);

      await flush(el, () => el.shadowRoot.querySelectorAll('.hub-section-sidenav__group-header').length);

      expect([...el.shadowRoot.querySelectorAll('.hub-section-sidenav__group-header')]
        .map((header) => header.textContent.trim())).to.deep.equal(['RSP', 'SWC']);
    });
  });

  describe('responding to hub:section-selected', () => {
    it('fetches and renders the selected section tree', async () => {
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await el.updateComplete;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('hub-sidenav-item'));
      expect(el.shadowRoot.querySelector('nav')).to.not.be.null;
      expect(el.shadowRoot.querySelectorAll('hub-sidenav-item[data-nested="1"]')).to.have.lengthOf(3);
    });

    it('opens the drawer on mobile when a section is selected', async () => {
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await el.updateComplete;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));
      expect(el.hasAttribute('open')).to.be.true;
    });
  });

  describe('mobile back-to-menu', () => {
    it('renders a "Back to main menu" button when open on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav__back'));
      expect(el.shadowRoot.querySelector('.hub-section-sidenav__back')).to.not.be.null;
    });

    it('closes itself when "Back to main menu" is clicked', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav__back'));
      el.shadowRoot.querySelector('.hub-section-sidenav__back').click();
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });
  });

  describe('Escape key', () => {
    it('closes the drawer when open on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });
  });

  describe('inert behaviour', () => {
    it('nav is inert when closed on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await flush(el, () => el.shadowRoot.querySelector('nav'));
      expect(el.shadowRoot.querySelector('nav').inert).to.be.true;
    });

    it('nav is not inert when open on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open') && el.shadowRoot.querySelector('nav'));
      expect(el.shadowRoot.querySelector('nav').inert).to.be.false;
    });
  });

  describe('back button dispatches hub:section-nav-back', () => {
    it('fires hub:section-nav-back after closing via back button', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav__back'));
      // Fake RAF after setup so the hub:section-nav-back RAF fires on demand,
      // not at the display's frame rate (background tabs throttle RAF to ~1fps).
      const clock = sandbox.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      const spy = sandbox.spy();
      document.addEventListener('hub:section-nav-back', spy);
      el.shadowRoot.querySelector('.hub-section-sidenav__back').click();
      await el.updateComplete;
      clock.runAll();
      document.removeEventListener('hub:section-nav-back', spy);
      expect(spy.calledOnce).to.be.true;
    });
  });

  describe('closing via hub:sidenav-closed', () => {
    it('removes the open attribute on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:sidenav-toggle', { detail: { open: true } }));
      await flush(el, () => el.hasAttribute('open'));
      document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.be.false;
    });
  });
});
