import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { setConfig } from '../../scripts/ak.js';
import init from '../../blocks/page-hero/page-hero.js';

describe('page-hero block', () => {
  let sandbox;
  const originalUrl = window.location.pathname + window.location.search + window.location.hash;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
    // init() loads nested blocks via ak.js's loadBlock, which reads config.components —
    // normally set by scripts.js's loadPage(), which this file never calls.
    setConfig({ components: [] });
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
    window.history.pushState({}, '', originalUrl);
  });

  // component-status's init fetches both the status index and the Figma roster.
  function stubStatusFetch() {
    return sandbox.stub(window, 'fetch').callsFake((url) => {
      if (String(url).includes('figma')) {
        return Promise.resolve(new Response('[]', { status: 200 }));
      }
      const index = {
        components: [{ name: 'Button', platforms: { web: { swc: { status: 'available' } } } }],
      };
      return Promise.resolve(new Response(JSON.stringify(index), { status: 200 }));
    });
  }

  function mount(children) {
    const el = document.createElement('div');
    el.className = 'page-hero';
    el.append(...children);
    document.body.append(el);
    return el;
  }

  it('resolves without loading anything when there are no nested blocks', async () => {
    const h1 = document.createElement('h1');
    h1.textContent = 'Button';
    const el = mount([h1]);

    await init(el);

    expect(el.contains(h1)).to.be.true;
    expect(el.children.length).to.equal(1);
  });

  it('loads a nested .breadcrumbs child (calls its real init)', async () => {
    window.history.pushState({}, '', '/web/swc/components/button');
    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    const el = mount([breadcrumbs, document.createElement('h1')]);

    await init(el);

    // dataset.blockName is stamped by ak.js's loadBlock — proof init actually ran this block.
    expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
    expect(breadcrumbs.textContent).to.include('SWC');
  });

  it('loads a nested .component-status child (calls its real init)', async () => {
    stubStatusFetch();
    window.history.pushState({}, '', '/web/swc/components/button');
    const status = document.createElement('div');
    status.className = 'component-status';
    const el = mount([document.createElement('h1'), status]);

    await init(el);

    expect(status.dataset.blockName).to.equal('component-status');
    expect(status.querySelectorAll('.component-status-pill').length).to.equal(1);
  });

  it('loads a nested breadcrumbs and component-status child together', async () => {
    stubStatusFetch();
    window.history.pushState({}, '', '/web/swc/components/button');
    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    const status = document.createElement('div');
    status.className = 'component-status';
    const el = mount([breadcrumbs, document.createElement('h1'), status]);

    await init(el);

    expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
    expect(status.dataset.blockName).to.equal('component-status');
  });

  it('removes a nested breadcrumbs child on a page its own resolveContext rejects', async () => {
    window.history.pushState({}, '', '/web/overview');
    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    const el = mount([breadcrumbs, document.createElement('h1')]);

    await init(el);

    expect(el.contains(breadcrumbs)).to.be.false;
  });

  it('does not load a block nested deeper than a direct child', async () => {
    window.history.pushState({}, '', '/web/swc/components/button');
    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    const wrapper = document.createElement('div');
    wrapper.append(breadcrumbs);
    const el = mount([wrapper, document.createElement('h1')]);

    await init(el);

    expect(breadcrumbs.dataset.blockName).to.be.undefined;
  });

  it('ignores non-breadcrumbs/component-status children', async () => {
    const p = document.createElement('p');
    p.textContent = 'A clickable action.';
    const el = mount([document.createElement('h1'), p]);

    await init(el);

    expect(p.dataset.blockName).to.be.undefined;
    expect(el.contains(p)).to.be.true;
  });
});
