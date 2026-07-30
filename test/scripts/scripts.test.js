import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { loadPage } from '../../scripts/scripts.js';

describe('scripts.js', () => {
  describe('loadPage — bootstrap', () => {
    it('adds spectrum-edge class to document.documentElement', () => {
      expect(document.documentElement.classList.contains('spectrum-edge')).to.be.true;
    });
  });

  describe('decorateArea — eager image loading', () => {
    before(async () => {
      document.body.innerHTML = '<img src="test.jpg" loading="lazy">';
      await loadPage();
    });

    it('removes the loading attribute from the first non-SVG image', () => {
      const img = document.querySelector('img');
      expect(img.hasAttribute('loading')).to.be.false;
    });

    it('sets fetchPriority to high on the first non-SVG image', () => {
      const img = document.querySelector('img');
      expect(img.fetchPriority).to.equal('high');
    });

    it('skips SVG images and eager-loads the first non-SVG image instead', async () => {
      document.body.innerHTML = `
        <img src="icon.svg" loading="lazy">
        <img src="hero.jpg" loading="lazy">
      `;
      await loadPage();
      expect(document.querySelector('img[src="icon.svg"]').hasAttribute('loading')).to.be.true;
      expect(document.querySelector('img[src="hero.jpg"]').hasAttribute('loading')).to.be.false;
    });

    it('does not throw when there is no image', async () => {
      document.body.innerHTML = '<div>no images</div>';
      await loadPage();
    });
  });

  describe('decorateArea — main id', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('sets main.id to "main-content" when main has no id', async () => {
      document.body.innerHTML = '<main><p>Content</p></main>';
      await loadPage();
      expect(document.querySelector('main').id).to.equal('main-content');
    });

    it('does not overwrite an existing main id', async () => {
      document.body.innerHTML = '<main id="custom-id"><p>Content</p></main>';
      await loadPage();
      expect(document.querySelector('main').id).to.equal('custom-id');
    });

    it('does not throw when there is no main element', async () => {
      document.body.innerHTML = '<p>no main here</p>';
      await loadPage();
    });
  });

  describe('decorateArea — page header', () => {
    let sandbox;
    const originalHref = window.location.href;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
      document.body.innerHTML = '';
      window.history.pushState({}, '', originalHref);
      // Guaranteed cleanup even if an assertion above throws — a leaked <meta
      // name="template"> would otherwise silently affect every later test in the suite.
      document.head.querySelector('meta[name="template"]')?.remove();
    });

    it('does not build a page header on a marketing-template page', async () => {
      const meta = document.createElement('meta');
      meta.name = 'template';
      meta.content = 'marketing';
      document.head.append(meta);
      document.body.innerHTML = '<main><div><h1>Landing</h1></div></main>';
      await loadPage();
      expect(document.querySelector('.page-hero')).to.be.null;
    });

    it('does not build a page header when there is no h1', async () => {
      document.body.innerHTML = '<main><div><p>No heading here</p></div></main>';
      await loadPage();
      expect(document.querySelector('.page-hero')).to.be.null;
    });

    it('wraps a bare h1 in a page header on a component page', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = '<main><div><h1>Button</h1></div></main>';
      await loadPage();
      const header = document.querySelector('.page-hero');
      expect(header).to.not.be.null;
      expect(header.firstElementChild.tagName).to.equal('H1');
    });

    it('does not build a page header on a page with no "components" segment at all', async () => {
      window.history.pushState({}, '', '/guidelines/color');
      document.body.innerHTML = '<main><div><h1>Color</h1></div></main>';
      await loadPage();
      expect(document.querySelector('.page-hero')).to.be.null;
    });

    it('does not create a component-status placeholder on a non-component page', async () => {
      window.history.pushState({}, '', '/guidelines/color');
      document.body.innerHTML = '<main><div><h1>Color</h1></div></main>';
      await loadPage();
      expect(document.querySelector('.component-status')).to.be.null;
    });

    it('creates a component-status placeholder on a component page when the author placed none', async () => {
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = '<main><div><h1>Button</h1></div></main>';
      const slice = { web: { swc: { status: 'available' } } };
      const fetchStub = sandbox.stub(window, 'fetch').callsFake((url) => (
        String(url).endsWith('/deps/status/button.json')
          ? Promise.resolve(new Response(JSON.stringify(slice), { status: 200 }))
          : Promise.resolve(new Response('', { status: 404 }))
      ));

      await loadPage();

      const header = document.querySelector('.page-hero');
      expect(header.querySelector('.component-status')).to.not.be.null;
      expect(header.querySelectorAll('.component-status-pill').length).to.equal(1);
      // buildPageHeader's early prefetch and component-status's own init() should share
      // one request, not fetch twice.
      expect(fetchStub.callCount).to.equal(1);
    });

    it('includes the immediately-following paragraph as the description', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = '<main><div><h1>Button</h1><p>A clickable action.</p></div></main>';
      await loadPage();
      const header = document.querySelector('.page-hero');
      expect(header.children[0].tagName).to.equal('H1');
      expect(header.children[1].tagName).to.equal('P');
      expect(header.children[1].textContent).to.equal('A clickable action.');
    });

    it('does not pull in a paragraph that is not immediately after the h1', async () => {
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = `
        <main><div>
          <h1>Button</h1>
          <div class="component-status"></div>
          <p>Not a description.</p>
        </div></main>
      `;
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      await loadPage();
      expect(document.querySelector('.page-hero').querySelector('p')).to.be.null;
    });

    it('composes an existing breadcrumbs block and component-status block around the h1', async () => {
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = `
        <main><div>
          <div class="breadcrumbs"></div>
          <h1>Button</h1>
          <p>A clickable action.</p>
          <div class="component-status"></div>
        </div></main>
      `;
      const slice = { web: { swc: { status: 'available' } } };
      sandbox.stub(window, 'fetch').callsFake((url) => (
        String(url).endsWith('/deps/status/button.json')
          ? Promise.resolve(new Response(JSON.stringify(slice), { status: 200 }))
          : Promise.resolve(new Response('', { status: 404 }))
      ));

      await loadPage();

      const header = document.querySelector('.page-hero');
      const tags = [...header.children].map((child) => child.tagName);
      // breadcrumbs' own init replaces its placeholder <div> with a <nav> (WAI-ARIA
      // breadcrumb pattern), so the first child is a NAV rather than a DIV.
      expect(tags).to.deep.equal(['NAV', 'H1', 'P', 'DIV']);
      expect(header.children[0].classList.contains('breadcrumbs')).to.be.true;
      expect(header.children[3].classList.contains('component-status')).to.be.true;
      expect(header.querySelector('.breadcrumbs').textContent).to.include('SWC');
      expect(header.querySelectorAll('.component-status-pill').length).to.equal(1);
    });
  });
});
