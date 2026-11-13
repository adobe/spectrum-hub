import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { resolveImplementation, decorateGoToImpl } from '../../scripts/utils/go-to-impl.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';

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
    it('derives native documentation URLs with DA aliases and the SnackbarHost exception', () => {
      for (const [platform, slug, path] of [
        ['ios', 'buttons', 'button'],
        ['ios', 'switches', 'switch'],
        ['ios', 'snackbars-and-toasts', 'toast'],
        ['ios', 'toggle-buttons', 'togglebutton'],
        ['android', 'buttons', 'com.adobe.spectrum.components.button/-spectrum-button.html'],
        ['android', 'switches', 'com.adobe.spectrum.components.switch/-spectrum-switch.html'],
        ['android', 'snackbars-and-toasts', 'com.adobe.spectrum.components.snackbar/-spectrum-snackbar-host.html'],
        ['android', 'toggle-buttons', 'com.adobe.spectrum.components.togglebutton/-spectrum-toggle-button.html'],
      ]) {
        const base = platform === 'ios'
          ? 'https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/'
          : 'https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/';
        expect(resolveImplementation(`/mobile/${platform}/components/${slug}`)).to.deep.equal({
          label: platform === 'ios' ? 'iOS' : 'Android',
          href: `${base}${path}`,
        });
      }
    });

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

    it('maps an RSP AI component to an anchor on the shared AI components page', () => {
      // The @react-spectrum/ai cohort has no page of its own per component; every one of
      // them is a section of /ai-components.html, anchored by its lowercased export name.
      expect(resolveImplementation('/web/rsp/components/user-message', null, 'ai')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ai-components.html#usermessage',
      });
    });

    it('strips the slug\'s separators for a multi-word AI anchor', () => {
      expect(resolveImplementation('/web/rsp/components/prompt-field', null, 'ai')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ai-components.html#promptfield',
      });
    });

    it('builds the ordinary per-component RSP URL for the default S2 package', () => {
      expect(resolveImplementation('/web/rsp/components/action-button', null, 's2')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ActionButton.html',
      });
    });

    it('uses an AI upstreamName over the URL slug when the two differ', () => {
      expect(resolveImplementation('/web/rsp/components/suggestion-group', 'MessageSuggestionList', 'ai')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ai-components.html#messagesuggestionlist',
      });
    });

    it('ignores the package for swc while preserving its pattern documentation section', () => {
      const names = { swc: { 'prompt-field': { docsSection: 'patterns-ai-toolkit' } } };
      expect(resolveImplementation('/web/swc/components/prompt-field', null, 'ai', names)).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-prompt-field--docs',
      });
    });

    it('uses the SWC documentation section from injected metadata', () => {
      const names = { swc: { 'prompt-field': { docsSection: 'patterns-ai-toolkit' } } };
      expect(resolveImplementation('/web/swc/components/prompt-field', undefined, undefined, names)).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-prompt-field--docs',
      });
    });

    it('uses CEM-derived documentation metadata rather than a pattern route group', () => {
      expect(resolveImplementation('/web/swc/patterns/conversational-ai/response-status')?.href).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-response-status--docs',
      );
    });

    it('uses the RSP AI documentation for a pattern page when its package is AI', () => {
      expect(resolveImplementation('/web/rsp/patterns/ai-toolkit/prompt-field', null, 'ai')?.href).to.equal(
        'https://react-spectrum.adobe.com/ai-components.html#promptfield',
      );
    });

    it('keeps the components section when SWC metadata has no documentation section', () => {
      expect(resolveImplementation('/web/swc/components/button', undefined, undefined, {})).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-button--docs',
      });
    });

    it('uses injected component metadata without mutating the generated catalog', () => {
      const names = { rsp: { 'prompt-field': { package: 'ai' } } };
      expect(resolveImplementation('/web/rsp/components/prompt-field', undefined, undefined, names)).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ai-components.html#promptfield',
      });
    });

    it('resolves a documentation alias from component metadata by default', () => {
      expect(resolveImplementation('/web/rsp/components/action-group')).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ActionButtonGroup.html',
      });
    });

    it('allows explicit inputs to override the injected metadata', () => {
      const names = { rsp: { 'prompt-field': { package: 'ai', docs: 'Chat' } } };
      expect(resolveImplementation('/web/rsp/components/prompt-field', 'Button', 's2', names)).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/Button.html',
      });
    });

    it('allows a null upstream name to retain the route name', () => {
      const names = { rsp: { 'prompt-field': { package: 'ai', docs: 'Chat' } } };
      expect(resolveImplementation('/web/rsp/components/prompt-field', null, undefined, names)).to.deep.equal({
        label: 'RSP',
        href: 'https://react-spectrum.adobe.com/ai-components.html#promptfield',
      });
    });

    it('links published SWC AI components to their pattern documentation', () => {
      for (const slug of ['message-sources', 'response-status', 'prompt-field']) {
        expect(resolveImplementation(`/web/swc/components/${slug}`)?.href).to.equal(
          `https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-${slug}--docs`,
        );
      }
    });

    it('uses the parent docs page for a response status step', () => {
      expect(resolveImplementation('/web/swc/components/response-status-step', 'ResponseStatus')?.href).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-response-status--docs',
      );
    });

    it('uses the nested suggestion item documentation page', () => {
      expect(resolveImplementation('/web/swc/components/suggestion-item', 'SuggestionGroupSuggestionItem')?.href).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-suggestion-group-suggestion-item--docs',
      );
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

    it('uses the given upstreamName\'s slug instead of the URL slug when present', () => {
      // A shared page's status slice carries `upstreamName` (deps/build-status-index.js) —
      // neither upstream docs site has a page at the shared slug itself.
      expect(resolveImplementation('/web/swc/components/color-handle-and-loupe', 'ColorHandle')).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle--docs',
      });
    });

    it('ignores an empty upstreamName and falls back to the URL slug', () => {
      expect(resolveImplementation('/web/swc/components/action-button', undefined)).to.deep.equal({
        label: 'SWC',
        href: 'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      });
    });
  });

  describe('decorateGoToImpl', () => {
    it('renders both native documentation actions on shared mobile pages', () => {
      window.history.pushState({}, '', '/mobile/components/buttons');
      const a = makeAnchor();
      a.append(document.createElement('svg'));
      decorateGoToImpl(a, a.querySelector('span'));
      const links = [...document.querySelectorAll('a')];
      expect(links.map((link) => link.querySelector('span').textContent))
        .to.deep.equal(['Go to iOS', 'Go to Android']);
      expect(links.map((link) => link.href)).to.deep.equal([
        'https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/button',
        'https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.button/-spectrum-button.html',
      ]);
      for (const link of links) {
        expect(link.querySelector('svg')).to.exist;
        expect(link.target).to.equal('_blank');
        expect(link.rel).to.equal('noopener noreferrer');
        expect(link.getAttribute('aria-label')).to.contain('in a new tab');
      }
    });

    it('retains the generated parent documentation alias on a nested pattern page', () => {
      window.history.pushState({}, '', '/web/swc/patterns/conversational-ai/response-status/response-status-step');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.href).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-response-status--docs',
      );
    });

    for (const [slug, docsSlug, upstreamName] of [
      ['prompt-field', 'prompt-field', undefined],
      ['response-status-step', 'response-status', 'ResponseStatus'],
      ['suggestion-item', 'suggestion-group-suggestion-item', 'SuggestionGroupSuggestionItem'],
    ]) {
      it(`links ${slug} to its published pattern documentation`, () => {
        const metadata = sinon.stub(IMPL_COMPONENT_NAMES, 'swc').value({
          [slug]: { docs: upstreamName, docsSection: 'patterns-ai-toolkit' },
        });
        try {
          window.history.pushState({}, '', `/web/swc/components/${slug}`);
          const a = makeAnchor();
          decorateGoToImpl(a, a.querySelector('span'));
          expect(a.getAttribute('href')).to.equal(
            `https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-${docsSlug}--docs`,
          );
          expect(a.getAttribute('aria-label')).to.equal(`Go to SWC. Opens ${upstreamName ?? slug} in a new tab.`);
        } finally {
          metadata.restore();
        }
      });
    }

    it('uses generated SWC AI documentation metadata, including child-page redirects', () => {
      for (const [slug, story] of [
        ['message-sources', 'message-sources'],
        ['response-status', 'response-status'],
        ['response-status-step', 'response-status'],
        ['suggestion-item', 'suggestion-group-suggestion-item'],
      ]) {
        window.history.pushState({}, '', `/web/swc/components/${slug}`);
        const a = makeAnchor();
        decorateGoToImpl(a, a.querySelector('span'));
        expect(a.href).to.equal(
          `https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-${story}--docs`,
        );
      }
    });
    // upstreamName now comes from a static import of deps/build-status-index.js's build
    // output (deps/impl-component-names.js) rather than a per-page fetch — these exercise real
    // committed alias entries instead of stubbing a network response.
    it('sets the SWC label and deep-links to the SWC docs in a new tab', () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to SWC');
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
      expect(a.getAttribute('aria-label')).to.equal('Go to SWC. Opens action-button in a new tab.');
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
    });

    it('uses the RSP upstream name in the deep-link and accessible label', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-group');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.querySelector('span').textContent).to.equal('Go to RSP');
      expect(a.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButtonGroup.html');
      expect(a.getAttribute('aria-label')).to.equal('Go to RSP. Opens ActionButtonGroup in a new tab.');
    });

    it('deep-links to the primary component when the current impl carries an alias', () => {
      // deps/impl-component-names.js's swc entry for this shared slug: docs "ColorHandle".
      window.history.pushState({}, '', '/web/swc/components/color-handle-and-loupe');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-color-handle--docs',
      );
      expect(a.getAttribute('aria-label')).to.equal('Go to SWC. Opens ColorHandle in a new tab.');
    });

    it('ignores another impl\'s alias — only the current impl\'s entry applies', () => {
      // deps/impl-component-names.js gives "action-group" a docs name for rsp
      // (ActionButtonGroup) but not for swc, so the swc page falls back to its own
      // URL slug unchanged.
      window.history.pushState({}, '', '/web/swc/components/action-group');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-group--docs',
      );
    });

    it('still links an S2 component to its own page', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const a = makeAnchor();
      decorateGoToImpl(a, a.querySelector('span'));
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
