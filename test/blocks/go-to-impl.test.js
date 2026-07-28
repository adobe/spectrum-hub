import { expect } from '@esm-bundle/chai';
import { resolveImplementation, decorateGoToImpl } from '../../blocks/go-to-impl/go-to-impl.js';

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
  });

  describe('decorateGoToImpl', () => {
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
