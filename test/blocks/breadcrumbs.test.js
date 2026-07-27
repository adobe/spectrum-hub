import { expect } from '@esm-bundle/chai';
import init, { resolveContext, buildTrail, buildBreadcrumbs } from '../../blocks/breadcrumbs/breadcrumbs.js';

describe('breadcrumbs block', () => {
  describe('resolveContext', () => {
    it('resolves a swc component page', () => {
      expect(resolveContext('/web/swc/components/button')).to.deep.equal({
        impl: { id: 'swc', label: 'Spectrum Web Components', shortLabel: 'SWC' },
      });
    });

    it('resolves an rsp component page', () => {
      expect(resolveContext('/web/rsp/components/action-button').impl.id).to.equal('rsp');
    });

    it('returns null for a non-web top-level path', () => {
      expect(resolveContext('/mobile/ios/components/button')).to.be.null;
    });

    it('returns null for an unregistered implementation', () => {
      expect(resolveContext('/web/figma/components/button')).to.be.null;
    });

    it('returns null for a web implementation landing page with no components segment', () => {
      expect(resolveContext('/web/swc')).to.be.null;
    });

    it('returns null when the component slug is missing', () => {
      expect(resolveContext('/web/swc/components')).to.be.null;
    });

    it('returns null when the path is deeper than a component slug', () => {
      expect(resolveContext('/web/swc/components/button/extra')).to.be.null;
    });

    it('returns null for the web overview page', () => {
      expect(resolveContext('/web/overview')).to.be.null;
    });
  });

  describe('buildTrail', () => {
    it('builds Web > <short label> > Components for the given implementation', () => {
      const trail = buildTrail({ id: 'swc', label: 'Spectrum Web Components', shortLabel: 'SWC' });
      expect(trail).to.deep.equal([
        { label: 'Web', href: '/web/overview' },
        { label: 'SWC', href: '/web/swc' },
        { label: 'Components', href: null },
      ]);
    });
  });

  describe('buildBreadcrumbs', () => {
    it('returns null when the path does not resolve to a component page', () => {
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
  });

  describe('init', () => {
    let el;
    const originalHref = window.location.href;

    beforeEach(() => {
      el = document.createElement('nav');
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
    });

    it('appends the trail to the element when the current path resolves', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      init(el);
      expect(el.querySelector('ol')).to.not.be.null;
      expect(el.textContent).to.include('RSP');
    });
  });
});
