import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../templates/detail/detail.js';
import { setConfig } from '../../scripts/ak.js';

describe('detail template', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Stub log so loadBlock failures (e.g. missing page-nav block) are swallowed silently.
    // components must be an array — loadBlock calls components.some().
    setConfig({
      log: sandbox.stub(), components: [], linkBlocks: [], hostnames: [],
    });
    // decoratePage runs before the template and builds this scaffold; the detail
    // template only appends its own page-nav into the existing wrapper.
    document.body.innerHTML = `
      <div class="template-wrapper">
        <div class="nav-rail"></div>
        <main><div><p>Page content</p></div></main>
      </div>`;
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  it('appends nav.page-nav as the last child of the template-wrapper', async () => {
    await init();
    const lastChild = document.querySelector('.template-wrapper').lastElementChild;
    expect(lastChild.tagName.toLowerCase()).to.equal('nav');
    expect(lastChild.classList.contains('page-nav')).to.be.true;
  });

  it('adds aria-label "On this page" to the page-nav', async () => {
    await init();
    const pageNav = document.querySelector('nav.page-nav');
    expect(pageNav.getAttribute('aria-label')).to.equal('On this page');
  });

  it('does not create a second template-wrapper', async () => {
    await init();
    expect(document.querySelectorAll('.template-wrapper')).to.have.lengthOf(1);
  });

  it('preserves the existing main and its content', async () => {
    const original = document.querySelector('main');
    await init();
    expect(document.querySelector('.template-wrapper main')).to.equal(original);
    expect(document.querySelector('main p')).to.not.be.null;
  });

  it('does not throw when the wrapper is absent', async () => {
    document.body.innerHTML = '<main><p>x</p></main>';
    await init();
    expect(document.querySelector('.page-nav')).to.be.null;
  });
});
