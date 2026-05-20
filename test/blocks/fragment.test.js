import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, { loadFragment } from '../../blocks/fragment/fragment.js';

// Two-section fixture — exercises the multi-section branch of init.
const TWO_SECTION_HTML = `
  <!DOCTYPE html><html><body><main>
    <div>Section one</div>
    <div>Section two</div>
  </main></body></html>`;

// Single-section fixture — exercises the single-section unpack branch of init.
const ONE_SECTION_HTML = `
  <!DOCTYPE html><html><body><main>
    <div>Only section</div>
  </main></body></html>`;

function stubFetch(sandbox, html, status = 200) {
  return sandbox.stub(window, 'fetch').resolves(new Response(html, { status }));
}

// Creates a minimal section > p > a structure for init() tests.
// withSibling: true adds a <span> next to the <a>, making a the direct replace target.
function makeLink(href, { withSibling = false } = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  p.append(a);
  if (withSibling) {
    p.append(Object.assign(document.createElement('span'), { textContent: 'text' }));
  }
  section.append(p);
  document.body.append(section);
  return a;
}

describe('fragment block', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('loadFragment returns a decorated fragment on a successful fetch', () => {
    let fragment;

    beforeEach(async () => {
      stubFetch(sandbox, TWO_SECTION_HTML);
      ({ fragment } = await loadFragment('/test'));
    });

    it('returns a fragment property', () => {
      expect(fragment).to.not.be.undefined;
    });

    it('gives the fragment the fragment-content class', () => {
      expect(fragment.classList.contains('fragment-content')).to.be.true;
    });

    it('collects all main > div nodes as direct children', () => {
      expect(fragment.querySelectorAll(':scope > .section')).to.have.length(2);
    });

    it('applies .section class to each collected div via loadArea', () => {
      expect(fragment.querySelectorAll('.section')).to.have.length(2);
    });

    it('removes the fragment and hidden container from the document after load', () => {
      expect(document.contains(fragment)).to.be.false;
      expect(document.querySelector('.hidden-container')).to.be.null;
    });
  });

  describe('loadFragment returns an error when the fetch is not OK', () => {
    it('returns an error string for a 404 response', async () => {
      stubFetch(sandbox, '', 404);
      const result = await loadFragment('/missing');
      expect(result.error).to.be.a('string');
    });

    it('includes the HTTP status code in the error message', async () => {
      stubFetch(sandbox, '', 500);
      const result = await loadFragment('/error');
      expect(result.error).to.include('500');
    });

    it('does not return a fragment for non-OK responses', async () => {
      stubFetch(sandbox, '', 404);
      const { fragment } = await loadFragment('/missing');
      expect(fragment).to.be.undefined;
    });
  });

  describe('loadFragment rewrites relative media paths to absolute URLs', () => {
    it('rewrites ./media_* img src to an absolute URL', async () => {
      stubFetch(sandbox, `<!DOCTYPE html><html><body><main>
        <div><img src="./media_abc123.jpg"></div>
      </main></body></html>`);
      const { fragment } = await loadFragment('/some/path');
      const img = fragment.querySelector('img');
      expect(img.getAttribute('src')).to.match(/^https?:\/\//);
      expect(img.getAttribute('src')).to.include('media_abc123.jpg');
    });

    it('resolves the rewritten URL relative to the fragment path, not the page root', async () => {
      stubFetch(sandbox, `<!DOCTYPE html><html><body><main>
        <div><img src="./media_abc123.jpg"></div>
      </main></body></html>`);
      const { fragment } = await loadFragment('/fragments/nav/header');
      const img = fragment.querySelector('img');
      expect(img.getAttribute('src')).to.include('/fragments/nav/media_abc123.jpg');
    });

    it('rewrites ./media_* source srcset to an absolute URL', async () => {
      stubFetch(sandbox, `<!DOCTYPE html><html><body><main>
        <div><source srcset="./media_abc123.webp"></div>
      </main></body></html>`);
      const { fragment } = await loadFragment('/some/path');
      const source = fragment.querySelector('source');
      expect(source.getAttribute('srcset')).to.match(/^https?:\/\//);
      expect(source.getAttribute('srcset')).to.include('media_abc123.webp');
    });
  });

  describe('init resolves the correct fetch URL from the link href', () => {
    it('calls fetch with the pathname for a relative href (leading /)', async () => {
      const stub = stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink('/fragments/nav'));
      expect(stub.calledWith('/fragments/nav')).to.be.true;
    });

    it('calls fetch with the pathname for an absolute URL on the same origin', async () => {
      const stub = stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink(`${window.location.origin}/fragments/nav`));
      expect(stub.calledWith('/fragments/nav')).to.be.true;
    });

    it('calls fetch with the pathname for an AEM host whose org slug matches window', async () => {
      // localhost.aem.live → aemOrg='localhost', aemSite=undefined;
      // window hostname 'localhost' → winOrg='localhost', winSite=undefined — they match.
      const stub = stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink('https://localhost.aem.live/fragments/nav'));
      expect(stub.calledWith('/fragments/nav')).to.be.true;
    });

    it('calls fetch with the full href for an unrecognised external URL', async () => {
      const stub = stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink('https://external.example.com/fragment'));
      expect(stub.calledWith('https://external.example.com/fragment')).to.be.true;
    });
  });

  describe('init replaces the link element with the fetched fragment', () => {
    it('removes the sole-child ancestor chain up to .section on successful load', async () => {
      stubFetch(sandbox, ONE_SECTION_HTML);
      const a = makeLink('/fragments/test');
      const section = a.closest('.section');
      await init(a);
      expect(document.contains(section)).to.be.false;
    });

    it('removes only the link itself when it has a sibling element', async () => {
      stubFetch(sandbox, ONE_SECTION_HTML);
      const a = makeLink('/fragments/test', { withSibling: true });
      const section = a.closest('.section');
      await init(a);
      expect(document.contains(section)).to.be.true;
      expect(document.contains(a)).to.be.false;
    });

    it('inserts the single section directly — no fragment-content wrapper — for a one-section fragment', async () => {
      stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink('/fragments/test'));
      expect(document.querySelector('.section')).to.not.be.null;
      expect(document.querySelector('.fragment-content')).to.be.null;
    });

    it('inserts the fragment-content wrapper for a multi-section fragment', async () => {
      stubFetch(sandbox, TWO_SECTION_HTML);
      await init(makeLink('/fragments/test'));
      expect(document.querySelector('.fragment-content')).to.not.be.null;
    });

    it('assigns a base64 id to each inserted child for relative-path fragments', async () => {
      stubFetch(sandbox, ONE_SECTION_HTML);
      await init(makeLink('/fragments/test'));
      const inserted = document.querySelector('.section');
      const expectedId = btoa(encodeURIComponent('/fragments/test/1'));
      expect(inserted.id).to.equal(expectedId);
    });

    it('leaves the DOM unchanged when the fragment fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 404 }));
      const a = makeLink('/fragments/missing');
      const section = a.closest('.section');
      await init(a);
      expect(document.contains(a)).to.be.true;
      expect(document.contains(section)).to.be.true;
    });
  });
});
