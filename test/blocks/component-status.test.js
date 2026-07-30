import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { STATUSES } from '../../scripts/utils/status-model.js';
import { resolveImplementation } from '../../scripts/utils/go-to-impl.js';
import { resolveFigmaUrl } from '../../scripts/utils/figma.js';
import init, {
  toSlug,
  resolveContext,
  findComponent,
  buildPills,
  prefetchStatusData,
} from '../../blocks/component-status/component-status.js';

// A minimal index exercising the rendering branches:
// - ActionButton: experimental dev + available design (both pills present)
// - Button: available in every column
// - Switch: rsp not-available (label + icon for a non-available state)
// - Toolbar: a Figma-only component (no rsp/swc cell) to test pill omission
const MOCK_INDEX = {
  statuses: STATUSES,
  implementations: {
    web: [
      { id: 'figma', label: 'Figma' },
      { id: 'rsp', label: 'React Spectrum' },
      { id: 'swc', label: 'Spectrum Web Components' },
    ],
  },
  components: [
    {
      name: 'ActionButton',
      label: 'Action Button',
      platforms: {
        web: { figma: { status: 'available' }, rsp: { status: 'experimental' }, swc: { status: 'experimental' } },
      },
    },
    {
      name: 'Button',
      label: 'Button',
      platforms: {
        web: { figma: { status: 'available' }, rsp: { status: 'available', context: 'Stable' }, swc: { status: 'available' } },
      },
    },
    {
      name: 'Switch',
      label: 'Switch',
      platforms: {
        web: { figma: { status: 'available' }, rsp: { status: 'not-available' } },
      },
    },
    {
      name: 'Toolbar',
      label: 'Toolbar',
      platforms: {
        web: { figma: { status: 'available' } },
      },
    },
  ],
};

// The Figma roster (deps/figma/component-status.json shape) used for the Design link.
// Toolbar is deliberately absent so its Design pill falls back to a static span.
const FIGMA_DATA = [
  { name: 'Action button', figmaPageId: '9230:3620' },
  { name: 'Button', figmaPageId: '111:222' },
  { name: 'Switch', figmaPageId: '333:444' },
];

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

  // init fetches both the status index and the Figma roster.
  function stubFetch({ index = MOCK_INDEX, figma = FIGMA_DATA } = {}) {
    return sandbox.stub(window, 'fetch').callsFake((url) => {
      const body = String(url).includes('figma') ? figma : index;
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

  describe('findComponent', () => {
    it('matches a canonical PascalCase name by its kebab slug', () => {
      expect(findComponent(MOCK_INDEX, 'action-button')?.name).to.equal('ActionButton');
    });

    it('returns null when no component matches', () => {
      expect(findComponent(MOCK_INDEX, 'nonexistent')).to.be.null;
    });
  });

  describe('buildPills', () => {
    it('returns [] when the path does not resolve, index is null, or component is absent', () => {
      expect(buildPills('/web/swc/get-started', MOCK_INDEX, FIGMA_DATA)).to.deep.equal([]);
      expect(buildPills('/web/rsp/components/action-button', null, FIGMA_DATA)).to.deep.equal([]);
      expect(buildPills('/web/rsp/components/does-not-exist', MOCK_INDEX, FIGMA_DATA)).to.deep.equal([]);
    });

    it('builds a Development pill then a Design pill', () => {
      const pills = buildPills('/web/rsp/components/action-button', MOCK_INDEX, FIGMA_DATA);
      expect(pills.length).to.equal(2);
      expect(pills[0].dataset.kind).to.equal('dev');
      expect(pills[1].dataset.kind).to.equal('design');
    });

    it('labels pills "<kind> <status>" with the status lowercased', () => {
      const pills = buildPills('/web/rsp/components/button', MOCK_INDEX, FIGMA_DATA);
      expect(labelOf(pillByKind(pills, 'dev'))).to.equal('Development available');
      expect(labelOf(pillByKind(pills, 'design'))).to.equal('Design available');
    });

    it('reflects the implementation status from the path (experimental / not available)', () => {
      expect(labelOf(pillByKind(buildPills('/web/rsp/components/action-button', MOCK_INDEX, FIGMA_DATA), 'dev')))
        .to.equal('Development experimental');
      expect(labelOf(pillByKind(buildPills('/web/rsp/components/switch', MOCK_INDEX, FIGMA_DATA), 'dev')))
        .to.equal('Development not available');
    });

    it('links the Development pill to the go-to-impl (implementation docs) URL', () => {
      const dev = pillByKind(buildPills('/web/rsp/components/button', MOCK_INDEX, FIGMA_DATA), 'dev');
      expect(dev.tagName).to.equal('A');
      expect(dev.getAttribute('href')).to.equal(resolveImplementation('/web/rsp/components/button').href);
      expect(dev.getAttribute('target')).to.equal('_blank');
      expect(dev.getAttribute('rel')).to.equal('noopener noreferrer');
    });

    it('links the Design pill to the see-in-figma (Figma node) URL', () => {
      const design = pillByKind(buildPills('/web/rsp/components/button', MOCK_INDEX, FIGMA_DATA), 'design');
      expect(design.tagName).to.equal('A');
      expect(design.getAttribute('href')).to.equal(resolveFigmaUrl('button', FIGMA_DATA));
    });

    it('names the link destination and new tab for accessibility, keeping the visible label', () => {
      const dev = pillByKind(buildPills('/web/rsp/components/button', MOCK_INDEX, FIGMA_DATA), 'dev');
      expect(dev.getAttribute('aria-label')).to.equal('Development available. Opens RSP documentation in a new tab.');
    });

    it('falls back to a static span when the link cannot be resolved (no Figma entry)', () => {
      // Toolbar is absent from FIGMA_DATA, so its Design pill has no Figma node.
      const design = pillByKind(buildPills('/web/rsp/components/toolbar', MOCK_INDEX, FIGMA_DATA), 'design');
      expect(design.tagName).to.equal('SPAN');
      expect(design.hasAttribute('href')).to.be.false;
    });

    it('renders an icon glyph in each pill, using checkmarkcircle for available', () => {
      const pills = buildPills('/web/rsp/components/button', MOCK_INDEX, FIGMA_DATA);
      pills.forEach((pill) => expect(pill.querySelector('svg.component-status-icon')).to.not.be.null);
      const href = pillByKind(pills, 'dev').querySelector('svg use')?.getAttribute('href') ?? '';
      expect(href).to.include('checkmarkcircle');
    });

    it('omits a pill whose cell is missing (Figma-only component -> Design only)', () => {
      const pills = buildPills('/web/rsp/components/toolbar', MOCK_INDEX, FIGMA_DATA);
      expect(pills.length).to.equal(1);
      expect(pills[0].dataset.kind).to.equal('design');
    });
  });

  describe('prefetchStatusData', () => {
    it('stashes the fetch promise on the element and returns it', () => {
      const fetchStub = stubFetch();
      const el = document.createElement('div');
      const promise = prefetchStatusData(el);
      expect(el.pendingStatusFetch).to.equal(promise);
      expect(fetchStub.callCount).to.equal(2); // status index + figma roster
      return promise;
    });

    it('is reused by init instead of firing a second pair of fetches', async () => {
      const fetchStub = stubFetch();
      window.history.pushState({}, '', '/web/rsp/components/button');
      const el = document.createElement('div');
      el.className = 'component-status';
      document.body.append(el);

      prefetchStatusData(el);
      await init(el);

      expect(fetchStub.callCount).to.equal(2);
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
      stubFetch();
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.true;
      expect(el.getAttribute('role')).to.equal('group');
      expect(el.querySelectorAll('.component-status-pill').length).to.equal(2);
    });

    it('removes its element when the path does not resolve', async () => {
      stubFetch();
      window.history.pushState({}, '', '/web/rsp/get-started');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.false;
    });

    it('removes its element when the index fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.false;
    });

    it('removes its element when the component is absent from the index', async () => {
      stubFetch();
      window.history.pushState({}, '', '/web/rsp/components/does-not-exist');
      const el = mount();
      await init(el);
      expect(el.isConnected).to.be.false;
    });
  });
});
