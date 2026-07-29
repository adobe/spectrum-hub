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

  describe('decorateArea — heading classes', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('applies a trailing {.class} attribute list to the heading and strips it', async () => {
      document.body.innerHTML = '<h2>My heading {.heading-size-l}</h2>';
      await loadPage();
      const heading = document.querySelector('h2');
      expect(heading.classList.contains('heading-size-l')).to.be.true;
      expect(heading.textContent.trim()).to.equal('My heading');
    });

    it('applies multiple classes', async () => {
      document.body.innerHTML = '<h3>My heading {.heading-size-m.text-center}</h3>';
      await loadPage();
      const heading = document.querySelector('h3');
      expect(heading.classList.contains('heading-size-m')).to.be.true;
      expect(heading.classList.contains('text-center')).to.be.true;
    });

    it('preserves inline markup while stripping the marker from the last text node', async () => {
      document.body.innerHTML = '<h2>Some <strong>bold</strong> text {.heading-size-l}</h2>';
      await loadPage();
      const heading = document.querySelector('h2');
      expect(heading.classList.contains('heading-size-l')).to.be.true;
      expect(heading.querySelector('strong').textContent).to.equal('bold');
      expect(heading.textContent.trim()).to.equal('Some bold text');
    });

    it('does not throw and adds no class when there is no attribute list', async () => {
      document.body.innerHTML = '<h2>Plain heading</h2>';
      await loadPage();
      const heading = document.querySelector('h2');
      expect(heading.className).to.equal('');
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
