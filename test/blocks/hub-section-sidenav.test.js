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

function stubAnimationFrame(sandbox) {
  sandbox.stub(window, 'requestAnimationFrame').callsFake((cb) => {
    cb(performance.now());
    return 1;
  });
}

// hub-sidenav-item renders its link in its own nested shadow root, so
// `el.shadowRoot.activeElement` only reports the <hub-sidenav-item> host —
// traverse all the way down, same as the component's own getDeepActiveElement.
function deepActiveElement(root = document) {
  const active = root.activeElement;
  return active?.shadowRoot ? deepActiveElement(active.shadowRoot) : active;
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

      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-section-header'));

      expect(el.shadowRoot.querySelector('.hub-section-sidenav-section-header').textContent.trim()).to.equal('Web');
    });

    it('renders authored subgroup headers for direct branch nodes', async () => {
      window.history.pushState({}, '', '/web/rsp/components/button');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox, PLATFORM_PAGES);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);

      await flush(el, () => el.shadowRoot.querySelectorAll('.hub-section-sidenav-group-header').length);

      expect([...el.shadowRoot.querySelectorAll('.hub-section-sidenav-group-header')]
        .map((header) => header.textContent.trim())).to.deep.equal(['RSP', 'SWC']);
    });

    it('renders the top-level section header as a heading for accessible document structure', async () => {
      window.history.pushState({}, '', '/web/rsp/components/button');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox, PLATFORM_PAGES);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);

      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-section-header'));

      const header = el.shadowRoot.querySelector('.hub-section-sidenav-section-header');
      expect(header.tagName).to.equal('H2');
    });

    it('renders group headers as heading elements for accessible document structure', async () => {
      window.history.pushState({}, '', '/web/rsp/components/button');
      stubMatchMedia(sandbox);
      stubIndexFetch(sandbox, PLATFORM_PAGES);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);

      await flush(el, () => el.shadowRoot.querySelectorAll('.hub-section-sidenav-group-header').length);

      const headers = [...el.shadowRoot.querySelectorAll('.hub-section-sidenav-group-header')];
      expect(headers).to.have.length.above(0);
      headers.forEach((header) => expect(header.tagName).to.equal('H3'));
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

  describe('async section tree loading race', () => {
    it('renders the nav shell and falls back to the back button while the section tree is still loading on mobile', async () => {
      window.history.pushState({}, '', '/');
      stubAnimationFrame(sandbox);
      stubMatchMedia(sandbox, true);
      sandbox.stub(window, 'fetch').returns(new Promise(() => {}));

      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await el.updateComplete;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));

      expect(el.shadowRoot.querySelector('nav')).to.not.be.null;
      const backBtn = el.shadowRoot.querySelector('.hub-section-sidenav-back');
      expect(backBtn).to.not.be.null;
      expect(el.shadowRoot.activeElement === backBtn).to.be.true;
    });

    it('moves focus to the first item once the section tree finishes loading, when the drawer was already open', async () => {
      window.history.pushState({}, '', '/');
      stubAnimationFrame(sandbox);
      stubMatchMedia(sandbox, true);
      let resolveFetch;
      sandbox.stub(window, 'fetch').returns(new Promise((resolve) => { resolveFetch = resolve; }));

      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      await el.updateComplete;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));

      resolveFetch({ ok: true, json: () => Promise.resolve({ data: PAGES }) });
      await flush(el, () => el.shadowRoot.querySelector('hub-sidenav-item'));
      const firstItem = el.shadowRoot.querySelector('hub-sidenav-item')?.shadowRoot?.querySelector('a, button');
      expect(firstItem).to.not.be.null;

      await flush(el, () => deepActiveElement() === firstItem);
      expect(deepActiveElement() === firstItem).to.be.true;
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
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-back'));
      expect(el.shadowRoot.querySelector('.hub-section-sidenav-back')).to.not.be.null;
    });

    it('the back button has type="button" so it cannot submit an ancestor form', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-back'));
      const backBtn = el.shadowRoot.querySelector('.hub-section-sidenav-back');
      expect(backBtn.getAttribute('type')).to.equal('button');
    });

    it('closes itself when "Back to main menu" is clicked', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-back'));
      el.shadowRoot.querySelector('.hub-section-sidenav-back').click();
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

  describe('mobile drawer dialog semantics', () => {
    it('exposes modal dialog semantics on the host when open on mobile', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));

      expect(el.getAttribute('role')).to.equal('dialog');
      expect(el.getAttribute('aria-modal')).to.equal('true');
      expect(el.getAttribute('aria-label')).to.not.be.null;
    });

    it('removes dialog semantics once closed', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));
      expect(el.getAttribute('role')).to.equal('dialog');

      document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
      await el.updateComplete;

      expect(el.getAttribute('role')).to.be.null;
      expect(el.getAttribute('aria-modal')).to.be.null;
      expect(el.getAttribute('aria-label')).to.be.null;
    });
  });

  describe('background inerting on mobile', () => {
    it('marks sibling page content inert while the mobile drawer is open', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const sibling = document.createElement('button');
      document.body.append(sibling);

      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      expect(sibling.inert).to.be.false;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));

      expect(sibling.inert).to.be.true;
    });

    it('restores sibling page content when the drawer closes', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const sibling = document.createElement('button');
      document.body.append(sibling);

      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));
      expect(sibling.inert).to.be.true;

      document.dispatchEvent(new CustomEvent('hub:sidenav-closed'));
      await el.updateComplete;

      expect(sibling.inert).to.be.false;
    });

    it('clears any inert flag imposed on itself (e.g. by hub-global-sidenav\'s own sweep) when it opens', async () => {
      window.history.pushState({}, '', '/foundations/color');
      stubMatchMedia(sandbox, true);
      stubIndexFetch(sandbox);
      const el = document.createElement('hub-section-sidenav');
      document.body.append(el);
      // Simulate hub-global-sidenav having already inerted this element as an
      // ordinary sibling before this component became the active dialog.
      el.inert = true;

      document.dispatchEvent(new CustomEvent('hub:section-selected', { detail: { section: 'foundations' } }));
      await flush(el, () => el.hasAttribute('open'));

      expect(el.inert).to.be.false;
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
      await flush(el, () => el.shadowRoot.querySelector('.hub-section-sidenav-back'));
      // Fake RAF after setup so the hub:section-nav-back RAF fires on demand,
      // not at the display's frame rate (background tabs throttle RAF to ~1fps).
      const clock = sandbox.useFakeTimers({ toFake: ['requestAnimationFrame'] });
      const spy = sandbox.spy();
      document.addEventListener('hub:section-nav-back', spy);
      el.shadowRoot.querySelector('.hub-section-sidenav-back').click();
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
