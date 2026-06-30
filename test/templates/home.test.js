import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../templates/home/home.js';
import { setConfig } from '../../scripts/ak.js';

function makeHomeDOM() {
  document.body.innerHTML = `
    <main>
      <div><h1>Welcome</h1></div>
      <div class="block-content"><p>Intro content</p></div>
    </main>
  `;
}

describe('home template', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Stub log so loadBlock failures (e.g. missing blocks) are swallowed silently.
    // components must be an array — loadBlock calls components.some().
    setConfig({ log: sandbox.stub(), components: [], linkBlocks: [], hostnames: [] });
    makeHomeDOM();
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  describe('hero column', () => {
    it('adds heading-size-xxxxl class to the h1', async () => {
      await init();
      expect(document.querySelector('h1').classList.contains('heading-size-xxxxl')).to.be.true;
    });

    it('sets home-column class on the h1 parent div', async () => {
      await init();
      expect(document.querySelector('.home-column')).to.not.be.null;
    });

    it('home-column div contains the h1', async () => {
      await init();
      expect(document.querySelector('.home-column h1')).to.not.be.null;
    });

    it('moves the home-column div inside its next sibling', async () => {
      await init();
      expect(document.querySelector('.block-content .home-column')).to.not.be.null;
    });

    it('does not throw when the expected DOM structure is present', async () => {
      // init() rejecting would fail this test; a successful render confirms it.
      await init();
      expect(document.querySelector('.template-wrapper')).to.not.be.null;
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

    it('places the section sidenav inside the nav-rail so the global rail buttons have a listener', async () => {
      await init();
      const sitenav = document.querySelector('.nav-rail .hub-section-sidenav');
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
