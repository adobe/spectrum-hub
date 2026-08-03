import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
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
  let sandbox;

  beforeEach(() => {
    originalUrl = window.location.pathname + window.location.search + window.location.hash;
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    window.history.pushState({}, '', originalUrl);
    document.body.innerHTML = '';
    sandbox.restore();
  });

  // decorateGoToImpl fetches the current page's status slice (deps/status/<slug>.json)
  // to resolve a shared page back to its primary component; stub it so tests control
  // what that slice contains instead of hitting the network.
  function stubSliceFetch(data = null) {
    return sandbox.stub(window, 'fetch').resolves(
      data ? new Response(JSON.stringify(data), { status: 200 }) : new Response('', { status: 404 }),
    );
  }

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
    it('sets the SWC label and deep-links to the SWC docs in a new tab', async () => {
      stubSliceFetch();
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to SWC');
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
    });

    it('sets the RSP label and a PascalCase deep-link', async () => {
      stubSliceFetch();
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to RSP');
      expect(a.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButton.html');
    });

    it('deep-links to the primary component when the current impl\'s cell carries originalName', async () => {
      // Matches the real shape deps/build-status-index.js writes: originalName lives on
      // the specific impl's own cell, not at the top of the slice.
      stubSliceFetch({ web: { swc: { status: 'available', originalName: 'ColorHandle' } } });
      window.history.pushState({}, '', '/web/swc/components/color-handle-and-loupe');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle--docs',
      );
    });

    it('ignores another impl\'s originalName — only the current impl\'s cell applies', async () => {
      stubSliceFetch({ web: { rsp: { status: 'available', originalName: 'ColorHandle' } } });
      window.history.pushState({}, '', '/web/swc/components/color-handle-and-loupe');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle-and-loupe--docs',
      );
    });

    it('removes itself when the page is not a component page', async () => {
      const fetchStub = stubSliceFetch();
      window.history.pushState({}, '', '/web/swc/get-started');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
      // No components segment — there's no slug to look up, so no slice fetch either.
      expect(fetchStub.called).to.be.false;
    });

    it('removes itself when the implementation is unknown', async () => {
      stubSliceFetch();
      window.history.pushState({}, '', '/web/ios/components/button');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    it('falls back to the URL slug when the slice fetch fails', async () => {
      sandbox.stub(window, 'fetch').rejects(new Error('network error'));
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
    });
  });
});
