import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../blocks/footer/footer.js';

function makeFragmentHTML() {
  return `
  <!DOCTYPE html><html><body><main>
    <div>General footer content</div>
    <div>Legal links</div>
    <div>Copyright &copy; 2026 Adobe</div>
  </main></body></html>`;
}

function stubFetch(sandbox, html = makeFragmentHTML()) {
  return sandbox.stub(window, 'fetch').resolves(new Response(html, { status: 200 }));
}

describe('footer block', () => {
  let sandbox;
  let el;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
    el = document.createElement('div');
    document.body.append(el);
  });

  afterEach(() => {
    sandbox.restore();
    document.head.querySelectorAll('meta[name="footer"]').forEach((m) => m.remove());
  });

  describe('when using the fragments for content', () => {
    it('calls fetch with the default footer path when no metadata is set', async () => {
      const stub = stubFetch(sandbox);
      await init(el);
      expect(stub.calledOnceWith('/fragments/nav/footer')).to.be.true;
    });

    it('calls fetch with the metadata override path when footer metadata is set', async () => {
      const meta = document.createElement('meta');
      meta.name = 'footer';
      meta.content = '/custom/footer';
      document.head.append(meta);
      const stub = stubFetch(sandbox);
      await init(el);
      expect(stub.calledOnceWith('/custom/footer')).to.be.true;
    });

    it('does nothing when the fragment fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
      await init(el);
      expect(el.children.length).to.equal(0);
    });
  });

  describe('footer structure after init', () => {
    beforeEach(async () => {
      stubFetch(sandbox);
      await init(el);
    });

    it('appends the fragment with footer-content class to the footer element', () => {
      expect(el.querySelector('.footer-content')).to.not.be.null;
    });

    it('adds section-copyright class to the last section', () => {
      const sections = [...el.querySelectorAll('.section')];
      expect(sections.at(-1).classList.contains('section-copyright')).to.be.true;
    });

    it.skip('adds section-legal class to the second-to-last section', () => {
      const sections = [...el.querySelectorAll('.section')];
      expect(sections.at(-2).classList.contains('section-legal')).to.be.true;
    });
  });
});
