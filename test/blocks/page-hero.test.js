import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { setConfig } from '../../scripts/ak.js';

const COMPONENT_PATH = '/web/swc/components/button';

// The per-component status slice component-status fetches (deps/status/<slug>.json).
const STATUS_SLICE = {
  web: { swc: { status: 'available' }, figma: { status: 'experimental' } },
  figmaPageId: '9230:3620',
};

function setMeta(name, content) {
  document.head.querySelector(`meta[name="${name}"]`)?.remove();
  if (content === undefined) { return; }
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
}

// page-hero reads the page template once, at module-evaluation time, so a test
// that needs a different template imports a fresh copy behind a cache-busting
// query rather than trying to change it after the fact.
let runCount = 0;
async function loadPageHero({ template, description } = {}) {
  setMeta('template', template);
  setMeta('description', description);
  runCount += 1;
  const { default: init } = await import(`../../blocks/page-hero/page-hero.js?run=${runCount}`);
  return init;
}

// init() is synchronous and fires loadBlock without awaiting it, so returning
// from init only means the hero's own markup is in place — a nested block's
// decoration lands a few microtasks later.
function waitFor(predicate, description, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (performance.now() - start > timeout) {
        reject(new Error(`timed out waiting for ${description}`));
        return;
      }
      setTimeout(check, 10);
    };
    check();
  });
}

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
    setMeta('template', undefined);
    setMeta('description', undefined);
    window.history.pushState({}, '', originalUrl);
  });

  // component-status fetches one slice per component (deps/status/<slug>.json).
  function stubStatusFetch(slice = STATUS_SLICE) {
    return sandbox.stub(window, 'fetch').callsFake((url) => {
      if (String(url).includes('/deps/status/')) {
        return Promise.resolve(new Response(JSON.stringify(slice), { status: 200 }));
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
  }

  function mount(children) {
    const el = document.createElement('div');
    el.className = 'page-hero';
    el.append(...children);
    document.body.append(el);
    return el;
  }

  function heading(text = 'Button') {
    const h1 = document.createElement('h1');
    h1.textContent = text;
    return h1;
  }

  function breadcrumbsBlock() {
    const div = document.createElement('div');
    div.className = 'breadcrumbs';
    return div;
  }

  describe('without a heading', () => {
    it('replaces the block content with a "No heading found" message', async () => {
      const init = await loadPageHero();
      const el = mount([document.createElement('p')]);

      init(el);

      expect(el.textContent).to.equal('No heading found');
      expect(el.children.length).to.equal(0);
    });

    it('does not load a nested breadcrumbs block', async () => {
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs]);

      init(el);

      expect(breadcrumbs.dataset.blockName).to.be.undefined;
    });
  });

  describe('on a non-component page', () => {
    it('leaves the heading in place and adds nothing to it', async () => {
      const init = await loadPageHero();
      const h1 = heading();
      const el = mount([h1]);

      init(el);

      expect(el.contains(h1)).to.be.true;
      expect(el.children.length).to.equal(1);
    });

    it('adds neither a description nor a status block', async () => {
      const init = await loadPageHero({ description: 'A clickable action.' });
      const el = mount([heading()]);

      init(el);

      expect(el.querySelector('.description')).to.be.null;
      expect(el.querySelector('.component-status')).to.be.null;
    });

    it('still loads a nested breadcrumbs child (calls its real init)', async () => {
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      // dataset.blockName is stamped by ak.js's loadBlock before breadcrumbs' own
      // init replaces the placeholder <div> with a <nav> (WAI-ARIA breadcrumb
      // pattern) — check it first as proof loadBlock reached this block at all.
      expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
      await waitFor(() => el.querySelector('nav.breadcrumbs'), 'the breadcrumbs nav');
      expect(el.querySelector('nav.breadcrumbs').textContent).to.include('SWC');
    });

    it('lets breadcrumbs remove itself on a page its own resolveContext rejects', async () => {
      window.history.pushState({}, '', '/web/overview');
      const init = await loadPageHero();
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      await waitFor(() => !el.contains(breadcrumbs), 'the breadcrumbs block to be removed');
      expect(el.querySelector('nav.breadcrumbs')).to.be.null;
    });
  });

  describe('on a component page', () => {
    it('appends the description from metadata after the heading', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component', description: 'A clickable action.' });
      const el = mount([heading()]);

      init(el);

      const desc = el.querySelector('p.description');
      expect(desc.textContent).to.equal('A clickable action.');
      expect(desc.previousElementSibling.tagName).to.equal('H1');
    });

    it('falls back to a placeholder when the page has no description metadata', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      expect(el.querySelector('p.description').textContent)
        .to.equal('No description found in metadata.');
    });

    it('appends a component-status block and loads it (calls its real init)', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      const status = el.querySelector('.component-status');
      expect(status.dataset.blockName).to.equal('component-status');
      await waitFor(
        () => status.querySelectorAll('.component-status-pill').length === 2,
        'the Development and Design status pills',
      );
      expect(status.getAttribute('role')).to.equal('group');
    });

    it('lets component-status remove itself when the path has no indexed component', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', '/web/swc/get-started');
      const init = await loadPageHero({ template: 'component' });
      const el = mount([heading()]);

      init(el);

      const status = el.querySelector('.component-status');
      await waitFor(() => !el.contains(status), 'the component-status block to be removed');
    });

    it('loads a nested breadcrumbs child alongside the status block', async () => {
      stubStatusFetch();
      window.history.pushState({}, '', COMPONENT_PATH);
      const init = await loadPageHero({ template: 'component' });
      const breadcrumbs = breadcrumbsBlock();
      const el = mount([breadcrumbs, heading()]);

      init(el);

      expect(breadcrumbs.dataset.blockName).to.equal('breadcrumbs');
      expect(el.querySelector('.component-status').dataset.blockName).to.equal('component-status');
      await waitFor(() => el.querySelector('nav.breadcrumbs'), 'the breadcrumbs nav');
    });
  });

  it('ignores children that are not blocks it knows about', async () => {
    const init = await loadPageHero();
    const p = document.createElement('p');
    p.textContent = 'A clickable action.';
    const el = mount([heading(), p]);

    init(el);

    expect(p.dataset.blockName).to.be.undefined;
    expect(el.contains(p)).to.be.true;
  });
});
