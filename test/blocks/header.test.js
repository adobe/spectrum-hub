import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, { watchScroll } from '../../blocks/header/header.js';
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

    // The point of prepending before the fetch: on a returning page view the sitenav is
    // loaded and awaited before the header block even starts, so a skip link gated
    // behind this request doesn't exist yet when the nav is already tabbable.
    it('adds the skip link without waiting on the fragment', () => {
      sandbox.stub(window, 'fetch').returns(new Promise(() => {}));
      init(el);
      expect(el.querySelector('.skip-link')).to.not.be.null;
    });

    // The skip link is built locally and prepended before the fetch, so a failed
    // fragment costs the header content but never the bypass link.
    it('renders no header content when the fragment fetch fails', async () => {
      sandbox.stub(window, 'fetch').resolves(new Response('', { status: 500 }));
      await init(el);
      expect(el.querySelector('.header-content')).to.be.null;
      expect(el.querySelector('.skip-link')).to.not.be.null;
      expect(el.children.length).to.equal(1);
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

  describe('scroll state', () => {
    let scrollDesc;
    let teardown;

    const setScrollY = (value) => {
      Object.defineProperty(window, 'scrollY', { get: () => value, configurable: true });
    };
    beforeEach(() => {
      // scrollY is an own, configurable property of window, so it can be shadowed
      // for the test. The page itself can't be scrolled in a headless run.
      scrollDesc = Object.getOwnPropertyDescriptor(window, 'scrollY');
      document.body.append(document.createElement('main'));
    });

    afterEach(() => {
      teardown?.();
      teardown = undefined;
      Object.defineProperty(window, 'scrollY', scrollDesc);
    });

    it('does nothing when the page has no main element', () => {
      document.querySelector('main').remove();
      expect(watchScroll(el)).to.be.undefined;
      expect(el.classList.contains('is-scrolled')).to.be.false;
    });

    it('starts without the is-scrolled class at the top of the page', () => {
      setScrollY(0);
      teardown = watchScroll(el);
      expect(el.classList.contains('is-scrolled')).to.be.false;
    });

    it('adds is-scrolled once main has scrolled under the header', () => {
      setScrollY(0);
      teardown = watchScroll(el);
      setScrollY(5000);
      window.dispatchEvent(new Event('scroll'));
      expect(el.classList.contains('is-scrolled')).to.be.true;
    });

    it('removes is-scrolled when the page returns to the top', () => {
      setScrollY(5000);
      teardown = watchScroll(el);
      expect(el.classList.contains('is-scrolled')).to.be.true;
      setScrollY(0);
      window.dispatchEvent(new Event('scroll'));
      expect(el.classList.contains('is-scrolled')).to.be.false;
    });

    it('re-evaluates on resize', () => {
      const main = document.querySelector('main');
      let offsetTop = 200;
      sandbox.stub(main, 'offsetTop').get(() => offsetTop);
      sandbox.stub(el, 'offsetHeight').value(56);
      setScrollY(0);
      teardown = watchScroll(el);
      setScrollY(5000);
      window.dispatchEvent(new Event('resize'));
      expect(el.classList.contains('is-scrolled')).to.be.true;
      offsetTop = 6000;
      window.dispatchEvent(new Event('resize'));
      expect(el.classList.contains('is-scrolled')).to.be.false;
    });

    it('stops listening after teardown', () => {
      setScrollY(0);
      watchScroll(el)();
      setScrollY(5000);
      window.dispatchEvent(new Event('scroll'));
      expect(el.classList.contains('is-scrolled')).to.be.false;
    });

    it('is wired up by init', async () => {
      setScrollY(0);
      stubFetch(sandbox);
      await init(el);
      setScrollY(5000);
      window.dispatchEvent(new Event('scroll'));
      expect(el.classList.contains('is-scrolled')).to.be.true;
    });
  });

  describe('wordmark opacity styling', () => {
    it('fades only the second direct-child wordmark path', async () => {
      const link = document.createElement('link');
      const fixture = document.createElement('header');
      fixture.innerHTML = `
        <div class="header-content">
          <div class="brand-section">
            <a href="/">
              <svg viewBox="0 0 100 20">
                <path d="M0 0h10v10H0z"></path>
                <path d="M20 0h10v10H20z"></path>
              </svg>
            </a>
          </div>
          <svg viewBox="0 0 100 20">
            <path d="M40 0h10v10H40z"></path>
          </svg>
        </div>
      `;
      document.body.append(fixture);

      try {
        link.rel = 'stylesheet';
        link.href = '/blocks/header/header.css';
        const stylesheetReady = new Promise((resolve, reject) => {
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', () => reject(new Error('Failed to load header.css')), { once: true });
        });
        document.head.append(link);
        await stylesheetReady;

        const wordmarkPath = fixture.querySelector('.brand-section svg > path:nth-child(2)');
        const aPath = fixture.querySelector('.brand-section svg > path:first-child');
        const unrelatedPath = fixture.querySelector('.header-content > svg > path');
        expect(getComputedStyle(wordmarkPath).opacity).to.equal('1');
        wordmarkPath.style.transition = 'none';
        fixture.classList.add('is-scrolled');
        expect(getComputedStyle(wordmarkPath).opacity).to.equal('0');
        expect(getComputedStyle(aPath).opacity).to.equal('1');
        expect(getComputedStyle(unrelatedPath).opacity).to.equal('1');
      } finally {
        link.remove();
        fixture.remove();
      }
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
