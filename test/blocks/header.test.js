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
    document.body.append(el);
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

    it('appends the fragment with the header-content class', () => {
      expect(el.querySelector('.header-content')).to.not.be.null;
    });

    it('adds brand-section class to the first fragment section', () => {
      expect(el.querySelector('.brand-section')).to.not.be.null;
    });

    it('replaces the nav section with a <nav class="main-nav-section"> element', () => {
      expect(el.querySelector('nav.main-nav-section')).to.not.be.null;
    });

    it('adds aria-label="Main navigation" to the nav element', () => {
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

  describe('header mobile navigation', () => {
    beforeEach(async () => {
      stubFetch(sandbox);
      await init(el);
    });

    it('creates a mobile nav button inside the nav section', () => {
      expect(el.querySelector('nav.main-nav-section button.mobile-nav-button')).to.not.be.null;
    });

    it('sets the mobile nav button aria-expanded to "false" initially', () => {
      const button = el.querySelector('button.mobile-nav-button');
      expect(button.getAttribute('aria-expanded')).to.equal('false');
    });

    it('opens the nav and sets aria-expanded="true" when the button is clicked', () => {
      const button = el.querySelector('button.mobile-nav-button');
      button.click();
      expect(button.getAttribute('aria-expanded')).to.equal('true');
      expect(el.querySelector('nav.main-nav-section').classList.contains('open')).to.be.true;
    });

    it('closes the nav and sets aria-expanded="false" when the button is clicked again', () => {
      const button = el.querySelector('button.mobile-nav-button');
      button.click();
      button.click();
      expect(button.getAttribute('aria-expanded')).to.equal('false');
      expect(el.querySelector('nav.main-nav-section').classList.contains('open')).to.be.false;
    });

    it('closes the open nav when Escape is pressed', () => {
      const button = el.querySelector('button.mobile-nav-button');
      button.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(button.getAttribute('aria-expanded')).to.equal('false');
      expect(el.querySelector('nav.main-nav-section').classList.contains('open')).to.be.false;
    });

    it('creates a mobile nav list with id="main-nav-list" and aria-label', () => {
      const mobileNav = el.querySelector('#main-nav-list');
      expect(mobileNav).to.not.be.null;
      expect(mobileNav.getAttribute('aria-label')).to.equal('Mobile navigation');
    });

    it('includes nav links in the mobile nav list', () => {
      expect(el.querySelector('#main-nav-list a[href="/docs"]')).to.not.be.null;
    });

    it('includes action links in the mobile nav list', () => {
      expect(el.querySelector('#main-nav-list a[href="/search"]')).to.not.be.null;
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

  describe('aria-current on nav links', () => {
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
