import { expect } from '@esm-bundle/chai';
import { resolveImplementation, decorateGoToImpl } from '../../scripts/utils/go-to-impl.js';

function makeAnchor(text = 'Go to implementation') {
  const a = document.createElement('a');
  const span = document.createElement('span');
  span.textContent = text;
  a.append(span);
  document.body.append(a);
  return a;
}

describe('go-to-impl block', () => {
  let originalUrl;

  beforeEach(() => {
    originalUrl = window.location.pathname + window.location.search + window.location.hash;
  });

  afterEach(() => {
    window.history.pushState({}, '', originalUrl);
    document.body.innerHTML = '';
  });

  describe('resolveImplementation — component page → impl docs URL', () => {
    it('maps swc to the Spectrum Web Components Storybook docs URL', () => {
      expect(resolveImplementation('/web/swc/components/action-button')).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      });
    });

    it('maps rsp to the PascalCase react-spectrum docs URL', () => {
      expect(resolveImplementation('/web/rsp/components/action-button')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ActionButton.html',
      });
    });

    it('returns null when there is no components segment', () => {
      expect(resolveImplementation('/web/swc/get-started')).to.equal(null);
    });

    it('returns null for an unknown implementation', () => {
      expect(resolveImplementation('/web/ios/components/button')).to.equal(null);
    });

    it('returns null for the home page', () => {
      expect(resolveImplementation('/')).to.equal(null);
    });

    it('uses the given originalName\'s slug instead of the URL slug when present', () => {
      // A shared page's status slice carries `originalName` (deps/build-status-index.js) —
      // neither upstream docs site has a page at the shared slug itself.
      expect(resolveImplementation('/web/swc/components/color-handle-and-loupe', 'ColorHandle')).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle--docs',
      });
    });

    it('ignores an empty originalName and falls back to the URL slug', () => {
      expect(resolveImplementation('/web/swc/components/action-button', undefined)).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      });
    });
  });

  describe('decorateGoToImpl', () => {
    // originalName now comes from a static import of deps/build-status-index.js's build
    // output (deps/impl-aliases.json) rather than a per-page fetch — these exercise real
    // committed alias entries instead of stubbing a network response.
    it('sets the SWC label and deep-links to the SWC docs in a new tab', () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to SWC');
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
    });

    it('sets the RSP label and a PascalCase deep-link', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to RSP');
      expect(a.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButton.html');
    });

    it('deep-links to the primary component when the current impl carries an alias', () => {
      // deps/impl-aliases.json's swc entry for this shared slug: originalName "ColorHandle".
      window.history.pushState({}, '', '/web/swc/components/color-handle-and-loupe');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle--docs',
      );
    });

    it('ignores another impl\'s alias — only the current impl\'s entry applies', () => {
      // deps/impl-aliases.json aliases "action-group" for rsp (ActionButtonGroup) but not
      // for swc, so the swc page falls back to its own URL slug unchanged.
      window.history.pushState({}, '', '/web/swc/components/action-group');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-group--docs',
      );
    });

    it('removes itself when the page is not a component page', () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    it('removes itself when the implementation is unknown', () => {
      window.history.pushState({}, '', '/web/ios/components/button');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });
  });
});
