import { expect } from '@esm-bundle/chai';
import { loadPage } from '../../scripts/scripts.js';

describe('scripts.js', () => {
  describe('loadPage — bootstrap', () => {
    it('adds spectrum-edge class to document.documentElement', () => {
      expect(document.documentElement.classList.contains('spectrum-edge')).to.be.true;
    });

    it('sets lang="en" on document.documentElement for the root (non-localized) site', () => {
      expect(document.documentElement.lang).to.equal('en');
    });
  });

  describe('decorateArea — eager image loading', () => {
    before(async () => {
      document.body.innerHTML = '<main><img src="test.jpg" loading="lazy"></main>';
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
        <main>
          <img src="icon.svg" loading="lazy">
          <img src="hero.jpg" loading="lazy">
        </main>
      `;
      await loadPage();
      expect(document.querySelector('img[src="icon.svg"]').hasAttribute('loading')).to.be.true;
      expect(document.querySelector('img[src="hero.jpg"]').hasAttribute('loading')).to.be.false;
    });

    it('does not eager-load images outside of main', async () => {
      document.body.innerHTML = '<img src="outside.jpg" loading="lazy"><main></main>';
      await loadPage();
      expect(document.querySelector('img[src="outside.jpg"]').hasAttribute('loading')).to.be.true;
    });

    it('does not throw when there is no image', async () => {
      document.body.innerHTML = '<main><div>no images</div></main>';
      await loadPage();
    });
  });
});
