import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { resolveImplementation } from '../../scripts/utils/go-to-impl.js';
import { figmaNodeUrl } from '../../scripts/utils/figma.js';
import init, {
  toSlug,
  resolveContext,
  buildPills,
  fetchComponentSlice,
  prefetchStatusData,
} from '../../blocks/component-status/component-status.js';

// deps/status/<slug>.json shape: this component's web cells + (optionally) its Figma
// node id, exactly as deps/build-status-index.js's buildComponentSlices would emit it.
const ACTION_BUTTON = {
  web: { figma: { status: 'available' }, rsp: { status: 'experimental' }, swc: { status: 'experimental' } },
  figmaPageId: '9230:3620',
};
const BUTTON = {
  web: { figma: { status: 'available' }, rsp: { status: 'available', context: 'Stable' }, swc: { status: 'available' } },
  figmaPageId: '111:222',
};
const SWITCH = {
  web: { figma: { status: 'available' }, rsp: { status: 'not-available' } },
  // No figmaPageId: build-time Figma roster search found no match.
};
const TOOLBAR = {
  web: { figma: { status: 'available' } },
  // Present in Figma but no node id resolved (matches the old "no roster entry" case).
};

const labelOf = (pill) => pill.querySelector('.component-status-label').textContent;
const pillByKind = (pills, kind) => pills.find((pill) => pill.dataset.kind === kind);

describe('component-status block', () => {
  let sandbox;
  let originalUrl;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    originalUrl = window.location.pathname + window.location.search + window.location.hash;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
    window.history.pushState({}, '', originalUrl);
  });

  function stubSliceFetch(slug, data) {
    return sandbox.stub(window, 'fetch').callsFake((url) => {
      const body = String(url).endsWith(`/deps/status/${slug}.json`) ? data : null;
      if (body === null) { return Promise.resolve(new Response('', { status: 404 })); }
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
  }

  describe('toSlug', () => {
    it('kebab-cases a PascalCase canonical name', () => {
      expect(toSlug('ActionButton')).to.equal('action-button');
    });

    it('splits an acronym boundary (TableView)', () => {
      expect(toSlug('TableView')).to.equal('table-view');
    });
  });

  describe('resolveContext', () => {
    it('resolves rsp and swc component pages', () => {
      expect(resolveContext('/web/rsp/components/action-button')).to.deep.equal({ impl: 'rsp', slug: 'action-button' });
      expect(resolveContext('/web/swc/components/button')).to.deep.equal({ impl: 'swc', slug: 'button' });
    });

    it('returns null for figma / non-component / home / missing-slug paths', () => {
      expect(resolveContext('/web/figma/components/button')).to.be.null;
      expect(resolveContext('/web/swc/get-started')).to.be.null;
      expect(resolveContext('/')).to.be.null;
      expect(resolveContext('/web/rsp/components')).to.be.null;
    });
  });

  describe('buildPills', () => {
    it('returns [] when the path does not resolve or there is no slice', () => {
      expect(buildPills('/web/swc/get-started', ACTION_BUTTON)).to.deep.equal([]);
      expect(buildPills('/web/rsp/components/action-button', null)).to.deep.equal([]);
    });

    it('builds a Development pill then a Design pill', () => {
      const pills = buildPills('/web/rsp/components/action-button', ACTION_BUTTON);
      expect(pills.length).to.equal(2);
      expect(pills[0].dataset.kind).to.equal('dev');
      expect(pills[1].dataset.kind).to.equal('design');
    });

    it('labels pills "<kind> <status>" with the status lowercased', () => {
      const pills = buildPills('/web/rsp/components/button', BUTTON);
      expect(labelOf(pillByKind(pills, 'dev'))).to.equal('Development available');
      expect(labelOf(pillByKind(pills, 'design'))).to.equal('Design available');
    });

    it('reflects the implementation status from the path (experimental / not available)', () => {
      expect(labelOf(pillByKind(buildPills('/web/rsp/components/action-button', ACTION_BUTTON), 'dev')))
        .to.equal('Development experimental');
      expect(labelOf(pillByKind(buildPills('/web/rsp/components/switch', SWITCH), 'dev')))
        .to.equal('Development not available');
    });

    it('links the Development pill to the go-to-impl (implementation docs) URL', () => {
      const dev = pillByKind(buildPills('/web/rsp/components/button', BUTTON), 'dev');
      expect(dev.tagName).to.equal('A');
      expect(dev.getAttribute('href')).to.equal(resolveImplementation('/web/rsp/components/button').href);
      expect(dev.getAttribute('target')).to.equal('_blank');
      expect(dev.getAttribute('rel')).to.equal('noopener noreferrer');
    });

    it('links the Design pill straight to the build-resolved Figma node id', () => {
      const design = pillByKind(buildPills('/web/rsp/components/button', BUTTON), 'design');
      expect(design.tagName).to.equal('A');
      expect(design.getAttribute('href')).to.equal(figmaNodeUrl(BUTTON.figmaPageId));
    });

    it('names the link destination and new tab for accessibility, keeping the visible label', () => {
      const dev = pillByKind(buildPills('/web/rsp/components/button', BUTTON), 'dev');
      expect(dev.getAttribute('aria-label')).to.equal('Development available. Opens RSP documentation in a new tab.');
    });

    it('falls back to a static span when no Figma node id was resolved at build time', () => {
      const design = pillByKind(buildPills('/web/rsp/components/toolbar', TOOLBAR), 'design');
      expect(design.tagName).to.equal('SPAN');
      expect(design.hasAttribute('href')).to.be.false;
    });

    it('renders an icon glyph in each pill, using checkmarkcircle for available', () => {
      const pills = buildPills('/web/rsp/components/button', BUTTON);
      pills.forEach((pill) => expect(pill.querySelector('svg.component-status-icon')).to.not.be.null);
      const href = pillByKind(pills, 'dev').querySelector('svg use')?.getAttribute('href') ?? '';
      expect(href).to.include('checkmarkcircle');
    });

    it('omits a pill whose cell is missing (Figma-only component -> Design only)', () => {
      const pills = buildPills('/web/rsp/components/toolbar', TOOLBAR);
      expect(pills.length).to.equal(1);
      expect(pills[0].dataset.kind).to.equal('design');
    });
  });

  describe('fetchComponentSlice', () => {
    it('fetches deps/status/<slug>.json', async () => {
      stubSliceFetch('button', BUTTON);
      expect(await fetchComponentSlice('button')).to.deep.equal(BUTTON);
    });

    it('returns null when the file is missing', async () => {
      stubSliceFetch('button', BUTTON);
      expect(await fetchComponentSlice('does-not-exist')).to.be.null;
    });

    it('returns null when the fetch throws', async () => {
      sandbox.stub(window, 'fetch').rejects(new Error('network down'));
      expect(await fetchComponentSlice('button')).to.be.null;
    });
  });

  describe('prefetchStatusData', () => {
    it('stashes the slice fetch promise on the element, keyed by the current path\'s slug', () => {
      const fetchStub = stubSliceFetch('button', BUTTON);
      window.history.pushState({}, '', '/web/rsp/components/button');
      const el = document.createElement('div');
      const promise = prefetchStatusData(el);
      expect(el.pendingStatusFetch).to.equal(promise);
      return promise.then(() => expect(fetchStub.callCount).to.equal(1));
    });

    it('resolves to null without fetching when the path does not resolve', async () => {
      const fetchStub = stubSliceFetch('button', BUTTON);
      window.history.pushState({}, '', '/web/overview');
      const el = document.createElement('div');
      expect(await prefetchStatusData(el)).to.be.null;
      expect(fetchStub.called).to.be.false;
    });

    it('is reused by init instead of firing a second fetch', async () => {
      const fetchStub = stubSliceFetch('button', BUTTON);
      window.history.pushState({}, '', '/web/rsp/components/button');
      const el = document.createElement('div');
      el.className = 'component-status';
      document.body.append(el);

      prefetchStatusData(el);
      await init(el);

      expect(fetchStub.callCount).to.equal(1);
      expect(el.querySelectorAll('.component-status-pill').length).to.equal(2);
    });
  });

  describe('init', () => {
    function mount() {
      const el = document.createElement('div');
      el.className = 'component-status';
      document.body.append(el);
      return el;
    }

    it('fills the element with the status pills and a group label on a component page', async () => {
      stubSliceFetch('action-button', ACTION_BUTTON);
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.true;
      expect(el.getAttribute('role')).to.equal('group');
      expect(el.querySelectorAll('.component-status-pill').length).to.equal(2);
    });

    it('removes its element when the path does not resolve', async () => {
      stubSliceFetch('action-button', ACTION_BUTTON);
      window.history.pushState({}, '', '/web/rsp/get-started');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.false;
    });

    it('removes its element when the slice fetch 404s', async () => {
      stubSliceFetch('button', BUTTON); // stubs a different slug than requested below
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.false;
    });
  });
});
