import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import * as componentPath from '../../scripts/utils/component-path.js';
import * as componentSlice from '../../scripts/utils/component-slice.js';
import * as figma from '../../scripts/utils/figma.js';
import * as implementation from '../../scripts/utils/go-to-impl.js';

// TODO(cache-rollout): Remove this suite and both test/rollout-fixtures provider modules
// in figma-rollout-3-cleanup after the documented cache-retirement gates are met.
const fetchSource = window.fetch.bind(window);
const objectUrls = [];

async function moduleUrl(path, overrides = {}) {
  const response = await fetchSource(path);
  expect(response.ok, `module source ${path}`).to.equal(true);
  const source = (await response.text()).replace(
    /(\bfrom\s+)(['"])([^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      const url = new URL(specifier, new URL(path, window.location.origin));
      return `${prefix}${quote}${overrides[url.pathname] ?? url.href}${quote}`;
    },
  );
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  objectUrls.push(url);
  return url;
}

async function cachedProviders() {
  const path = await moduleUrl('/test/rollout-fixtures/component-path.js');
  const slice = await moduleUrl('/test/rollout-fixtures/component-slice.js');
  return {
    '/scripts/utils/component-path.js': path,
    '/scripts/utils/component-slice.js': slice,
  };
}

describe('cache rollout compatibility', () => {
  let fetchStub;
  let originalUrl;

  beforeEach(() => {
    originalUrl = window.location.href;
    componentSlice.resetComponentSliceCacheForTests();
    fetchStub = sinon.stub(window, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
    window.history.replaceState({}, '', originalUrl);
    document.body.replaceChildren();
    objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  });

  it('prepares the APIs required by the later block deployment', () => {
    expect(componentPath.componentContextFromPath).to.be.a('function');
    expect(componentPath.platformsForContext).to.be.a('function');
    expect(componentSlice.componentSlugForPlatform).to.be.a('function');
    expect(componentSlice.fetchComponentPageSlice).to.be.a('function');
    expect(figma.getFigmaLinks).to.be.a('function');
    expect(implementation.resolveImplementations).to.be.a('function');
    const context = componentPath.componentContextFromPath('/web/swc/components/button');
    expect(context).to.deep.equal({ platform: 'web', impl: 'swc', slug: 'button' });
    expect(componentPath.platformsForContext(context)).to.deep.equal(['web']);
  });

  it('keeps pathname callers working alongside context callers', () => {
    const context = { platform: 'web', impl: 'swc', slug: 'button' };
    const legacy = implementation.resolveImplementation('/web/swc/components/button');
    expect(legacy?.href).to.equal(
      'https://spectrum-web-components.adobe.com/?path=/docs/components-button--docs',
    );
    expect(implementation.resolveImplementation(context)).to.deep.equal(legacy);
  });

  it('reads legacy Web nodes without guessing a native file', () => {
    const data = { web: { figma: { status: 'available' } }, figmaPageId: '9230:3620' };
    const links = figma.getFigmaLinks({ platform: 'web', impl: 'swc', slug: 'button' }, data);
    expect(links).to.have.lengthOf(1);
    expect(links[0].href).to.equal(
      'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
    );
    expect(figma.getFigmaLinks({ platform: 'ios', impl: 'ios', slug: 'button' }, data))
      .to.deep.equal([]);
  });

  it('keeps explicit selected references ahead of the legacy Web field', () => {
    const data = {
      web: {
        figma: {
          figmaSource: 'ai-toolkit',
          figmaFile: '3WdX799d7ptEVA6RuTESXs',
          figmaPageId: '1:2',
        },
      },
      figmaPageId: '9230:3620',
    };
    const links = figma.getFigmaLinks({ platform: 'web', impl: 'swc', slug: 'button' }, data);
    expect(links[0].href).to.contain('/3WdX799d7ptEVA6RuTESXs/');
    expect(links[0].href).to.contain('node-id=1-2');
  });

  it('fetches Web slices through the prepared context API', async () => {
    const data = { web: { swc: { status: 'available' } } };
    fetchStub.resolves({ ok: true, json: async () => data });
    expect(await componentSlice.fetchComponentPageSlice({
      platform: 'web', impl: 'swc', slug: 'button',
    })).to.deep.equal(data);
    expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/button.json');
  });

  it('preserves the prepared authored-status data contract for cached consumers', async () => {
    const prepared = await import('../../scripts/utils/authored-status.js');
    const block = document.createElement('div');
    block.className = 'component-status';
    block.innerHTML = `
      <div>
        <div>Code available</div>
        <div><a href="https://example.com/code">Documentation</a></div>
      </div>
    `;
    document.body.append(block);

    const resources = prepared.getAuthoredStatusBlocks(block).get(block);

    expect(resources).to.have.lengthOf(1);
    expect(resources[0]).to.include({ kind: 'dev', text: 'Code available', status: 'available' });
    expect(resources[0].link.href).to.equal('https://example.com/code');
    expect(prepared.STATUS_PILLS.find((pill) => pill.kind === resources[0].kind).label)
      .to.equal('Code');
  });

  it('renders current authored content with the prepared status provider cached', async () => {
    const prepared = await moduleUrl('/scripts/utils/authored-status.js');
    const { default: init } = await import(await moduleUrl(
      '/blocks/component-status/component-status.js',
      { '/scripts/utils/authored-status.js': prepared },
    ));
    const block = document.createElement('div');
    block.className = 'component-status';
    block.innerHTML = `
      <div>
        <div><p><a href="https://example.com/menu"><strong>Explore Menu</strong></a></p></div>
        <div>Android resources coming soon</div>
      </div>
    `;
    document.body.append(block);
    const link = block.querySelector('a');

    await init(block);

    expect(block.querySelectorAll('.component-status-pill')).to.have.lengthOf(2);
    expect(block.querySelector('a')).to.equal(link);
    expect(link.textContent).to.equal('Explore Menu');
    expect(link.querySelector('strong')).not.to.be.null;
    expect(block.children[1].textContent).to.equal('Android resources coming soon');
    expect(fetchStub.called).to.be.false;
  });

  ['path', 'slice', 'both'].forEach((providers) => {
    it(`keeps legacy entry points usable with cached ${providers} providers`, async () => {
      const overrides = await cachedProviders();
      if (providers === 'path') { delete overrides['/scripts/utils/component-slice.js']; }
      if (providers === 'slice') { delete overrides['/scripts/utils/component-path.js']; }
      const modules = await Promise.all([
        '/scripts/utils/component-slice.js',
        '/scripts/utils/go-to-impl.js',
        '/scripts/utils/figma.js',
      ].map(async (path) => import(await moduleUrl(path, overrides))));
      const [sliceModule, implModule, figmaModule] = modules;
      const data = { web: { figma: { status: 'available' } }, figmaPageId: '9230:3620' };
      fetchStub.resolves({ ok: true, json: async () => data });
      expect(await sliceModule.fetchComponentSlice('button')).to.deep.equal(data);
      expect(implModule.resolveImplementation('/web/swc/components/button')?.label).to.equal('SWC');
      window.history.replaceState({}, '', '/web/swc/components/button');
      const anchor = document.createElement('a');
      anchor.innerHTML = '<span>See in Figma</span>';
      document.body.append(anchor);
      await figmaModule.decorateSeeInFigma(anchor, anchor.querySelector('span'));
      expect(anchor.href).to.contain('node-id=9230-3620');
    });
  });
});
