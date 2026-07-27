import { expect } from '@esm-bundle/chai';
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

  describe('decorateArea — breadcrumbs', () => {
    const originalHref = window.location.href;

    afterEach(() => {
      document.body.innerHTML = '';
      window.history.pushState({}, '', originalHref);
    });

    it('prepends a breadcrumbs nav as the first child of main on a component page', async () => {
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = '<main><h1>Button</h1></main>';
      await loadPage();
      const main = document.querySelector('main');
      expect(main.firstElementChild.classList.contains('breadcrumbs')).to.be.true;
      expect(main.firstElementChild.textContent).to.include('SWC');
    });

    it('does not add a breadcrumbs nav when the path is not a component page', async () => {
      window.history.pushState({}, '', '/web/overview');
      document.body.innerHTML = '<main><h1>Overview</h1></main>';
      await loadPage();
      expect(document.querySelector('main .breadcrumbs')).to.be.null;
    });

    it('does not add a second breadcrumbs nav when one is already present', async () => {
      window.history.pushState({}, '', '/web/swc/components/button');
      document.body.innerHTML = '<main><h1>Button</h1></main>';
      await loadPage();
      await loadPage();
      expect(document.querySelectorAll('main .breadcrumbs').length).to.equal(1);
    });
  });
});
