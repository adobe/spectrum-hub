import { expect } from '@esm-bundle/chai';
import init from '../../templates/home/home.js';

function makeHomeDOM() {
  document.body.innerHTML = `
    <main>
      <div><h1>Welcome</h1></div>
      <div class="block-content"><p>Intro content</p></div>
    </main>
  `;
}

describe('home template', () => {
  beforeEach(() => {
    makeHomeDOM();
  });

  afterEach(() => {
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

    it('does not create a template-wrapper — that is decoratePage\'s responsibility', async () => {
      await init();
      expect(document.querySelector('.template-wrapper')).to.be.null;
    });
  });
});
