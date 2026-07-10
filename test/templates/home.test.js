import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../templates/home/home.js';
import { setConfig } from '../../scripts/ak.js';

function makeHomeDOM() {
  document.body.innerHTML = `
    <main>
      <div>
        <h1>Welcome</h1>
        <p class="eyebrow"><svg></svg> Announcement</p>
        <p class="lead">Intro content</p>
      </div>
      <div class="block-content"></div>
    </main>
  `;
}

describe('home template', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setConfig({ log: sandbox.stub(), components: [], linkBlocks: [], hostnames: [] });
    makeHomeDOM();
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  describe('hero', () => {
    it('adds heading-size-xxxxl class to the h1', async () => {
      await init();
      expect(document.querySelector('h1').classList.contains('heading-size-xxxxl')).to.be.true;
    });

    it('sets home-hero class on the h1 parent div', async () => {
      await init();
      expect(document.querySelector('.home-hero')).to.not.be.null;
    });

    it('home-hero contains the h1', async () => {
      await init();
      expect(document.querySelector('.home-hero h1')).to.not.be.null;
    });

    it('moves the home-hero div inside its next sibling', async () => {
      await init();
      expect(document.querySelector('.block-content .home-hero')).to.not.be.null;
    });

    it('does not throw when the expected DOM structure is present', async () => {
      await init();
      expect(document.querySelector('.template-wrapper')).to.not.be.null;
    });
  });

  describe('hero banner', () => {
    it('creates a div.home-banner inside the hero', async () => {
      await init();
      expect(document.querySelector('.home-hero .home-banner')).to.not.be.null;
    });

    it('makes the banner the first child of the hero', async () => {
      await init();
      const hero = document.querySelector('.home-hero');
      expect(hero.firstElementChild.classList.contains('home-banner')).to.be.true;
    });

    it('moves the first two hero elements into the banner', async () => {
      await init();
      const banner = document.querySelector('.home-banner');
      expect(banner.children).to.have.lengthOf(2);
      expect(banner.querySelector('h1')).to.not.be.null;
      expect(banner.querySelector('p.eyebrow')).to.not.be.null;
    });

    it('leaves the remaining hero content outside the banner', async () => {
      await init();
      const hero = document.querySelector('.home-hero');
      const lead = hero.querySelector('p.lead');
      expect(lead).to.not.be.null;
      expect(lead.closest('.home-banner')).to.be.null;
    });

    it('moves the existing elements rather than cloning them', async () => {
      const originalHeading = document.querySelector('h1');
      await init();
      expect(document.querySelector('.home-banner h1')).to.equal(originalHeading);
    });
  });

  describe('nav-rail layout', () => {
    it('creates a div.template-wrapper in the DOM', async () => {
      await init();
      expect(document.querySelector('.template-wrapper')).to.not.be.null;
    });

    it('template-wrapper replaces main at the top level', async () => {
      await init();
      expect(document.body.firstElementChild.classList.contains('template-wrapper')).to.be.true;
    });

    it('places an aside.nav-rail as the first child of template-wrapper', async () => {
      await init();
      const firstChildElement = document.querySelector('.template-wrapper').firstElementChild;
      expect(firstChildElement.tagName.toLowerCase()).to.equal('aside');
      expect(firstChildElement.classList.contains('nav-rail')).to.be.true;
    });

    it('places the sitenav inside the nav-rail', async () => {
      await init();
      const sitenav = document.querySelector('.nav-rail nav.sitenav');
      expect(sitenav).to.not.be.null;
      expect(sitenav.getAttribute('aria-label')).to.equal('Second-level site navigation');
    });

    it('places main as the last child of template-wrapper', async () => {
      await init();
      const wrapper = document.querySelector('.template-wrapper');
      expect(wrapper.lastElementChild.tagName.toLowerCase()).to.equal('main');
    });

    it('preserves the original main element (not a copy)', async () => {
      const original = document.querySelector('main');
      await init();
      expect(document.querySelector('.template-wrapper main')).to.equal(original);
    });
  });
});
