import { expect } from '@esm-bundle/chai';
import init, { resolveContext, buildTrail, buildBreadcrumbs } from '../../blocks/breadcrumbs/breadcrumbs.js';

describe('breadcrumbs block', () => {
  describe('resolveContext', () => {
    it('resolves a web component page down to its ancestor segments', () => {
      expect(resolveContext('/web/swc/components/button')).to.deep.equal({
        segments: ['web', 'swc', 'components'],
      });
    });

    it('resolves a non-web page the same way', () => {
      expect(resolveContext('/mobile/ios/components/button')).to.deep.equal({
        segments: ['mobile', 'ios', 'components'],
      });
    });

    it('resolves an unregistered web implementation the same way', () => {
      expect(resolveContext('/web/figma/components/button')).to.deep.equal({
        segments: ['web', 'figma', 'components'],
      });
    });

    it('resolves a web implementation landing page to a single ancestor', () => {
      expect(resolveContext('/web/swc')).to.deep.equal({ segments: ['web'] });
    });

    it('resolves a deeper page down to all of its ancestors', () => {
      expect(resolveContext('/web/swc/components/button/extra')).to.deep.equal({
        segments: ['web', 'swc', 'components', 'button'],
      });
    });

    it('returns null for the homepage', () => {
      expect(resolveContext('/')).to.be.null;
    });

    it('returns null for a bare top-level section', () => {
      expect(resolveContext('/web')).to.be.null;
    });

    it('returns null for a section overview page', () => {
      expect(resolveContext('/web/overview')).to.be.null;
    });
  });

  describe('buildTrail', () => {
    it('builds Web > <short label> > Components for a registered web implementation', () => {
      expect(buildTrail(['web', 'swc', 'components'])).to.deep.equal([
        { label: 'Web', href: '/web/overview' },
        { label: 'SWC', href: '/web/swc' },
        { label: 'Components', href: null },
      ]);
    });

    it('falls back to a humanized label for an unregistered web implementation', () => {
      expect(buildTrail(['web', 'figma', 'components'])).to.deep.equal([
        { label: 'Web', href: '/web/overview' },
        { label: 'Figma', href: '/web/figma' },
        { label: 'Components', href: null },
      ]);
    });

    it('humanizes and links every segment outside the web section', () => {
      expect(buildTrail(['mobile', 'ios', 'components'])).to.deep.equal([
        { label: 'Mobile', href: '/mobile' },
        { label: 'Ios', href: '/mobile/ios' },
        { label: 'Components', href: null },
      ]);
    });

    it('humanizes multi-word (kebab-case) segments', () => {
      expect(buildTrail(['web', 'swc', 'components', 'action-button'])).to.deep.equal([
        { label: 'Web', href: '/web/overview' },
        { label: 'SWC', href: '/web/swc' },
        { label: 'Components', href: null },
        { label: 'Action Button', href: '/web/swc/components/action-button' },
      ]);
    });
  });

  describe('buildBreadcrumbs', () => {
    it('returns null when the path does not resolve', () => {
      expect(buildBreadcrumbs('/web/overview')).to.be.null;
    });

    it('returns an <ol> with a link crumb for Web', () => {
      const ol = buildBreadcrumbs('/web/swc/components/button');
      const webLink = ol.querySelector('li:nth-child(1) a');
      expect(webLink.textContent).to.equal('Web');
      expect(webLink.getAttribute('href')).to.equal('/web/overview');
    });

    it('returns an <ol> with a link crumb for the implementation short label', () => {
      const ol = buildBreadcrumbs('/web/swc/components/button');
      const implLink = ol.querySelector('li:nth-child(2) a');
      expect(implLink.textContent).to.equal('SWC');
      expect(implLink.getAttribute('href')).to.equal('/web/swc');
    });

    it('renders the terminal Components crumb as plain text, not a link', () => {
      const ol = buildBreadcrumbs('/web/swc/components/button');
      const last = ol.querySelector('li:nth-child(3)');
      expect(last.textContent).to.equal('Components');
      expect(last.querySelector('a')).to.be.null;
    });

    it('builds a trail for a non-web page', () => {
      const ol = buildBreadcrumbs('/mobile/ios/components/button');
      expect(ol.textContent).to.include('Mobile');
      expect(ol.textContent).to.include('Ios');
    });
  });

  // init always swaps the block's <div> for a fresh <nav>, so assertions look
  // at the replacement in the document rather than at the element passed in —
  // that one is detached by the time init returns.
  describe('init', () => {
    let el;
    const originalHref = window.location.href;

    beforeEach(() => {
      el = document.createElement('div');
      el.className = 'breadcrumbs';
      document.body.append(el);
    });

    afterEach(() => {
      document.body.innerHTML = '';
      window.history.pushState({}, '', originalHref);
    });

    it('removes the element when the current path does not resolve', () => {
      window.history.pushState({}, '', '/web/overview');
      init(el);
      expect(document.body.contains(el)).to.be.false;
      expect(document.body.querySelector('nav.breadcrumbs')).to.be.null;
    });

    it('appends the trail to the nav when the current path resolves', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      init(el);
      const nav = document.body.querySelector('nav.breadcrumbs');
      expect(nav.querySelector('ol')).to.not.be.null;
      expect(nav.textContent).to.include('RSP');
    });

    it('labels the nav landmark as "Breadcrumb" per the APG pattern', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      init(el);
      expect(document.body.querySelector('nav.breadcrumbs').getAttribute('aria-label'))
        .to.equal('Breadcrumb');
    });

    it('labels the nav "Breadcrumb" even when the authored div carried its own label', () => {
      el.setAttribute('aria-label', 'Custom trail');
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      init(el);
      expect(document.body.querySelector('nav.breadcrumbs').getAttribute('aria-label'))
        .to.equal('Breadcrumb');
    });

    it('promotes a <div> block wrapper to a real <nav> landmark', () => {
      const div = document.createElement('div');
      div.className = 'breadcrumbs block';
      document.body.replaceChildren(div);
      window.history.pushState({}, '', '/web/rsp/components/action-button');

      init(div);

      const nav = document.body.querySelector('nav.breadcrumbs');
      expect(nav).to.not.be.null;
      expect(nav.classList.contains('block')).to.be.true;
      expect(nav.getAttribute('aria-label')).to.equal('Breadcrumb');
      expect(document.body.contains(div)).to.be.false;
    });
  });
});
