import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { loadPage, decoratePage } from '../../scripts/scripts.js';
import { setConfig } from '../../scripts/ak.js';

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

  describe('decoratePage — page scaffold', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      // Swallow the async block load of the global sidenav; the assertions below
      // are all synchronous and only care about the scaffold decoratePage builds.
      setConfig({
        log: sandbox.stub(), components: [], linkBlocks: [], hostnames: [],
      });
      document.body.innerHTML = '<main><div><p>Content</p></div></main>';
    });

    afterEach(() => {
      sandbox.restore();
      document.body.innerHTML = '';
    });

    it('wraps main in a div.template-wrapper at the top level of body', () => {
      decoratePage();
      const wrapper = document.body.firstElementChild;
      expect(wrapper.classList.contains('template-wrapper')).to.be.true;
      expect(wrapper.tagName.toLowerCase()).to.equal('div');
    });

    it('places the nav-rail as the first child of the wrapper', () => {
      decoratePage();
      const navRail = document.querySelector('.template-wrapper').firstElementChild;
      expect(navRail.classList.contains('nav-rail')).to.be.true;
    });

    it('places main as the last child of the wrapper', () => {
      decoratePage();
      const wrapper = document.querySelector('.template-wrapper');
      expect(wrapper.lastElementChild.tagName.toLowerCase()).to.equal('main');
    });

    it('preserves the original main element (not a copy)', () => {
      const original = document.querySelector('main');
      decoratePage();
      expect(document.querySelector('.template-wrapper main')).to.equal(original);
    });

    it('places the global sidenav as the first child of the nav-rail', () => {
      decoratePage();
      const navRail = document.querySelector('.nav-rail');
      expect(navRail.firstElementChild.classList.contains('hub-global-sidenav')).to.be.true;
    });

    it('places the section sidenav inside the nav-rail', () => {
      decoratePage();
      expect(document.querySelector('.nav-rail .hub-section-sidenav')).to.not.be.null;
    });

    it('labels the section sidenav "Second-level site navigation"', () => {
      decoratePage();
      const sitenav = document.querySelector('.hub-section-sidenav');
      expect(sitenav.getAttribute('aria-label')).to.equal('Second-level site navigation');
    });

    it('does not throw or build a wrapper when there is no main element', () => {
      document.body.innerHTML = '<p>no main</p>';
      expect(() => decoratePage()).to.not.throw();
      expect(document.querySelector('.template-wrapper')).to.be.null;
    });
  });
});
