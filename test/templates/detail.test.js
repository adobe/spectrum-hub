import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../templates/detail/detail.js';
import { setConfig } from '../../scripts/ak.js';

describe('detail template', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setConfig({ log: sandbox.stub(), components: [], linkBlocks: [], hostnames: [] });
    document.body.innerHTML = '<main><div><p>Page content</p></div></main>';
  });

  afterEach(() => {
    sandbox.restore();
    document.body.innerHTML = '';
  });

  it('creates a div.template-wrapper in the DOM', async () => {
    await init();
    expect(document.querySelector('.template-wrapper')).to.not.be.null;
  });

  it('template-wrapper replaces main at the top level', async () => {
    await init();
    expect(document.body.firstElementChild.classList.contains('template-wrapper')).to.be.true;
  });

  it('places section.left-rail as the first child of template-wrapper', async () => {
    await init();
    const first = document.querySelector('.template-wrapper').firstElementChild;
    expect(first.tagName.toLowerCase()).to.equal('section');
    expect(first.classList.contains('left-rail')).to.be.true;
  });

  it('places main as the second child of template-wrapper', async () => {
    await init();
    const second = document.querySelector('.template-wrapper').children[1];
    expect(second.tagName.toLowerCase()).to.equal('main');
  });

  it('places section.right-rail as the last child of template-wrapper', async () => {
    await init();
    const last = document.querySelector('.template-wrapper').lastElementChild;
    expect(last.tagName.toLowerCase()).to.equal('section');
    expect(last.classList.contains('right-rail')).to.be.true;
  });

  it('places div.picker inside left-rail', async () => {
    await init();
    expect(document.querySelector('.left-rail .picker')).to.not.be.null;
  });

  it('places nav.sitenav inside left-rail', async () => {
    await init();
    const sitenav = document.querySelector('.left-rail nav.sitenav');
    expect(sitenav).to.not.be.null;
    expect(sitenav.getAttribute('aria-label')).to.equal('Second-level site navigation');
  });

  it('places nav.page-nav inside right-rail', async () => {
    await init();
    const pageNav = document.querySelector('.right-rail nav.page-nav');
    expect(pageNav).to.not.be.null;
    expect(pageNav.getAttribute('aria-label')).to.equal('On this page');
  });

  it('places aside.related-resources inside right-rail', async () => {
    await init();
    expect(document.querySelector('.right-rail aside.related-resources')).to.not.be.null;
  });

  it('preserves the original main element', async () => {
    const original = document.querySelector('main');
    await init();
    expect(document.querySelector('.template-wrapper main')).to.equal(original);
  });

  it('preserves content inside main', async () => {
    await init();
    expect(document.querySelector('main p')).to.not.be.null;
  });
});
