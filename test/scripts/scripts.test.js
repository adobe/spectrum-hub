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
});
