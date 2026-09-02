import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init from '../../blocks/header/header.js';
import { setConfig } from '../../scripts/ak.js';

const BRAND_HTML = '<a href="/">Spectrum</a>';
const NAV_HTML = '<ul><li><a href="/docs">Docs</a></li></ul>';
const ACTIONS_HTML = '<ul><li><a href="/search">Search</a></li></ul>';

function makeFragmentHTML({ brand = BRAND_HTML, nav = NAV_HTML, actions = ACTIONS_HTML } = {}) {
  return `<!DOCTYPE html><html><body><main>
    <div>${brand}</div>
    ${nav != null ? `<div>${nav}</div>` : ''}
    <div>${actions}</div>
  </main></body></html>`;
}

function stubFetch(sandbox, html = makeFragmentHTML()) {
  return sandbox.stub(window, 'fetch').resolves(new Response(html, { status: 200 }));
}

describe('header block', () => {
  let sandbox;
  let el;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setConfig({ log: sandbox.stub() });
    document.body.innerHTML = '';
    el = document.createElement('div');
    // createSkipLink points at the real <main>; without one it has no target to wire up.
    document.body.append(el, document.createElement('main'));
  });

  afterEach(() => {
    sandbox.restore();
    document.head.querySelectorAll('meta[name="header-path"]').forEach((m) => m.remove());
  });

  describe('when using the fragments for content', () => {
    it('calls fetch with the default header path when no metadata is set', async () => {
      const stub = stubFetch(sandbox);
      await init(el);
      expect(stub.calledOnceWith('/fragments/nav/header')).to.be.true;
    });

    it('calls fetch with the metadata override path when header metadata is set', async () => {
      const meta = document.createElement('meta');
      meta.name = 'header-path';
      meta.content = '/custom/nav';
      document.head.append(meta);
      const stub = stubFetch(sandbox);
      await init(el);
      expect(stub.calledOnceWith('/custom/nav')).to.be.true;
    });

    it('does nothing when the fragment fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
      await init(el);
      expect(el.children.length).to.equal(0);
    });
  });

  describe('header structure after init', () => {
    beforeEach(async () => {
      stubFetch(sandbox);
      await init(el);
    });

    it('prepends a skip link with href="#main-content"', () => {
      const skip = el.querySelector('.skip-link');
      expect(skip).to.not.be.null;
      expect(skip.getAttribute('href')).to.equal('#main-content');
    });

    it('adds visually-hidden class to the skip link', () => {
      expect(el.querySelector('.skip-link.visually-hidden')).to.not.be.null;
    });

    // A bare <main> isn't focusable, so in Safari the fragment jump scrolls without
    // moving focus and the next Tab resumes from the nav the user just skipped.
    it('makes main focusable so the skip link moves focus, not just scroll', () => {
      expect(document.querySelector('main').getAttribute('tabindex')).to.equal('-1');
    });

    it('appends the fragment with the header-content class', () => {
      expect(el.querySelector('.header-content')).to.not.be.null;
    });

    it('adds brand-section class to the first fragment section', () => {
      expect(el.querySelector('.brand-section')).to.not.be.null;
    });

    // Nav-section decoration was removed from header.js in c529b47 pending
    // migration to blocks/sitenav; re-enable once that migration lands.
    it.skip('replaces the nav section with a <nav class="main-nav-section"> element', () => {
      expect(el.querySelector('nav.main-nav-section')).to.not.be.null;
    });

    it.skip('adds aria-label="Main navigation" to the nav element', () => {
      expect(el.querySelector('nav.main-nav-section').getAttribute('aria-label')).to.equal('Main navigation');
    });

    it('adds actions-section class to the last fragment section', () => {
      expect(el.querySelector('.actions-section')).to.not.be.null;
    });

    it('adds role="region" and aria-label to the actions section', () => {
      const actions = el.querySelector('.actions-section');
      expect(actions.getAttribute('role')).to.equal('region');
      expect(actions.getAttribute('aria-label')).to.equal('Additional site actions');
    });
  });

  describe('header without nav section', () => {
    beforeEach(async () => {
      stubFetch(sandbox, makeFragmentHTML({ nav: null }));
      await init(el);
    });

    it('does not render a main nav section', () => {
      expect(el.querySelector('nav.main-nav-section')).to.be.null;
    });

    it('does not render a mobile nav button', () => {
      expect(el.querySelector('button.mobile-nav-button')).to.be.null;
    });

    it('does not render a mobile nav list', () => {
      expect(el.querySelector('#main-nav-list')).to.be.null;
    });

    it('still renders the brand section', () => {
      expect(el.querySelector('.brand-section')).to.not.be.null;
    });

    it('still renders the actions section', () => {
      expect(el.querySelector('.actions-section')).to.not.be.null;
    });
  });

  // aria-current on nav links was removed from header.js in c529b47 pending
  // migration to blocks/sitenav; re-enable once that migration lands.
  describe.skip('aria-current on nav links', () => {
    it('sets aria-current="page" on the link matching the current pathname', async () => {
      const currentPath = window.location.pathname;
      stubFetch(sandbox, makeFragmentHTML({
        nav: `<ul>
          <li><a href="${currentPath}">Current</a></li>
          <li><a href="/other">Other</a></li>
        </ul>`,
      }));
      await init(el);
      const links = [...el.querySelectorAll('nav.main-nav-section a')];
      const current = links.find((a) => a.pathname === currentPath);
      expect(current.getAttribute('aria-current')).to.equal('page');
    });

    it('does not set aria-current on links not matching the current pathname', async () => {
      const currentPath = window.location.pathname;
      stubFetch(sandbox, makeFragmentHTML({
        nav: `<ul>
          <li><a href="${currentPath}">Current</a></li>
          <li><a href="/other">Other</a></li>
        </ul>`,
      }));
      await init(el);
      const links = [...el.querySelectorAll('nav.main-nav-section a')];
      const other = links.find((a) => a.pathname === '/other');
      expect(other.hasAttribute('aria-current')).to.be.false;
    });
  });
});
