import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import init, { resolveContext, buildPills } from '../../blocks/component-status/component-status.js';
import { setConfig } from '../../scripts/ak.js';
import { resetComponentSliceCacheForTests } from '../../scripts/utils/component-slice.js';
import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';
import IMPL_COMPONENT_NAMES from '../../deps/impl-component-names.js';

const SAFE_CONFIG = {
  hostnames: ['authorkit.dev'],
  components: [],
  locales: { '': { lang: 'en' } },
};
const WEB_FIGMA = {
  figmaSource: 's2-web',
  figmaFile: 'xHBWBBIe2eo5vwoCeNrC4Q',
  figmaPageId: '123:456',
};
const MOBILE_BUTTON = {
  ios: {
    figma: {
      status: 'available',
      figmaSource: 's2-ios',
      figmaFile: 'OQExiy8bX0pRqee71eAWX6',
      figmaPageId: '3956:67276',
    },
  },
  android: {
    figma: {
      status: 'available',
      figmaSource: 's2-android',
      figmaFile: 'Yzbd4jgLTo6KhEPZKwv1WA',
      figmaPageId: '2002:3805',
    },
  },
};

const setSessionHint = () => {
  document.cookie = `spectrum_session_active=${Date.now() + 2 * 60 * 60 * 1000}; path=/`;
};

const clearSessionHint = () => {
  document.cookie = 'spectrum_session_active=; path=/; max-age=0';
};

function waitFor(predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      if (predicate()) {
        resolve();
      } else if (performance.now() - start > timeout) {
        reject(new Error('timed out waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

describe('component-status block', () => {
  it('renders native Code documentation links without inferring availability from Figma', () => {
    const pills = buildPills('/mobile/components/buttons', MOBILE_BUTTON);
    const code = pills.filter((pill) => pill.dataset.kind === 'dev');
    expect(code.map((pill) => pill.textContent.trim()))
      .to.deep.equal(['iOS Code documentation', 'Android Code documentation']);
    expect(code.map((pill) => pill.href)).to.deep.equal([
      'https://reimagined-adventure-9p6zm5p.pages.github.io/documentation/spectrumcomponents/button',
      'https://crispy-carnival-2qj6mnv.pages.github.io/spectrum_components/com.adobe.spectrum.components.button/-spectrum-button.html',
    ]);
    expect(code.every((pill) => !pill.hasAttribute('data-status'))).to.be.true;
  });

  describe('native Design pills', () => {
    it('links the shared DA buttons page to each native design, never web', () => {
      const pills = buildPills('/mobile/components/buttons', {
        ...MOBILE_BUTTON,
        web: { figma: { status: 'available', ...WEB_FIGMA } },
      }).filter((pill) => pill.dataset.kind === 'design');
      expect(pills.map((pill) => pill.textContent.trim())).to.deep.equal([
        'iOS Design available', 'Android Design available',
      ]);
      expect(pills.map((pill) => pill.getAttribute('href'))).to.deep.equal([
        'https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=3956-67276&m=dev',
        'https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android?node-id=2002-3805&m=dev',
      ]);
      expect(pills.every((pill) => pill.dataset.kind === 'design')).to.be.true;
    });

    it('shows a non-linked unavailable pill for the missing iOS design without borrowing web status', () => {
      const pills = buildPills('/mobile/components/switches', {
        android: MOBILE_BUTTON.android,
        web: { figma: { status: 'available', ...WEB_FIGMA } },
      }).filter((pill) => pill.dataset.kind === 'design');
      expect(pills.map((pill) => pill.textContent.trim())).to.deep.equal([
        'iOS Design not available', 'Android Design available',
      ]);
      expect(pills[0].tagName).to.equal('SPAN');
      expect(pills[0].hasAttribute('href')).to.be.false;
      expect(pills[1].href).to.contain('/Yzbd4jgLTo6KhEPZKwv1WA/');
    });

    it('never promotes web availability to a missing native design', () => {
      const pills = buildPills('/mobile/components/buttons', {
        web: { figma: { status: 'available', ...WEB_FIGMA } },
      }).filter((pill) => pill.dataset.kind === 'design');
      expect(pills.map((pill) => pill.textContent.trim())).to.deep.equal([
        'iOS Design not available', 'Android Design not available',
      ]);
      expect(pills.every((pill) => pill.tagName === 'SPAN')).to.be.true;
    });

    for (const source of FIGMA_SOURCES.filter((entry) => entry.platform !== 'web')) {
      it(`renders the ${source.platform} Design pill with its own file`, () => {
        const pills = buildPills(`/mobile/${source.platform}/components/button`, {
          web: { figma: { status: 'not-available' } },
          [source.platform]: {
            figma: {
              status: 'available',
              figmaSource: source.id,
              figmaFile: source.fileKey,
              figmaPageId: '1:2',
            },
          },
        }).filter((pill) => pill.dataset.kind === 'design');
        expect(pills).to.have.lengthOf(1);
        expect(pills[0].dataset.kind).to.equal('design');
        expect(pills[0].href).to.contain(`/design/${source.fileKey}/`);
      });
    }

    it('offers native documentation without inventing Code or Design status from web data', () => {
      const pills = buildPills('/mobile/ios/components/button', {
        web: { figma: { status: 'available' } },
      });
      expect(pills).to.have.lengthOf(1);
      expect(pills[0].textContent.trim()).to.equal('iOS Code documentation');
      expect(pills[0].hasAttribute('data-status')).to.be.false;
    });
  });

  describe('resolveContext', () => {
    it('resolves a nested pattern page without treating its group as an implementation', () => {
      expect(resolveContext('/web/swc/patterns/conversational-ai/response-status'))
        .to.deep.equal({ platform: 'web', impl: 'swc', slug: 'response-status' });
    });

    it('resolves the impl and slug from a component page path', () => {
      expect(resolveContext('/web/rsp/components/action-group')).to.deep.equal({
        platform: 'web', impl: 'rsp', slug: 'action-group',
      });
    });

    it('returns null for a page with no components segment', () => {
      expect(resolveContext('/web/rsp/get-started')).to.equal(null);
    });

    it('returns null for an unregistered implementation', () => {
      expect(resolveContext('/web/ios/components/button')).to.equal(null);
    });

    it('resolves the design-only route to its own impl', () => {
      expect(resolveContext('/web/design-only/components/alert-banner'))
        .to.deep.equal({ platform: 'web', impl: 'design-only', slug: 'alert-banner' });
    });
  });

  describe('buildPills — Code pill link', () => {
    it('shares pattern documentation metadata and the selected AI Toolkit design with widgets', () => {
      const source = FIGMA_SOURCES.find(({ id }) => id === 'ai-toolkit');
      const metadata = sinon.stub(IMPL_COMPONENT_NAMES, 'swc').value({
        'response-status-step': { docs: 'ResponseStatus', docsSection: 'patterns-ai-toolkit' },
      });
      try {
        const pills = buildPills('/web/swc/patterns/conversational-ai/response-status-step', {
          web: {
            swc: { status: 'available', upstreamName: 'ResponseStatus' },
            figma: {
              status: 'available',
              figmaSource: source.id,
              figmaFile: source.fileKey,
              figmaPageId: '1:2',
            },
          },
        });
        expect(pills).to.have.lengthOf(2);
        expect(pills.find((pill) => pill.dataset.kind === 'dev').href).to.equal(
          'https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-response-status--docs',
        );
        expect(pills.find((pill) => pill.dataset.kind === 'design').href).to.equal(
          `https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=1-2&m=dev`,
        );
      } finally {
        metadata.restore();
      }
    });

    for (const [slug, docsSlug, upstreamName] of [
      ['prompt-field', 'prompt-field', undefined],
      ['response-status-step', 'response-status', 'ResponseStatus'],
      ['suggestion-item', 'suggestion-group-suggestion-item', 'SuggestionGroupSuggestionItem'],
    ]) {
      it(`links ${slug}'s Code pill to its published pattern documentation`, () => {
        const metadata = sinon.stub(IMPL_COMPONENT_NAMES, 'swc').value({
          [slug]: { docsSection: 'patterns-ai-toolkit' },
        });
        try {
          const pills = buildPills(`/web/swc/components/${slug}`, {
            web: { swc: { status: 'available', upstreamName } },
          });
          expect(pills.find((pill) => pill.dataset.kind === 'dev').getAttribute('href')).to.equal(
            `https://spectrum-web-components.adobe.com/?path=/docs/patterns-ai-toolkit-${docsSlug}--docs`,
          );
        } finally {
          metadata.restore();
        }
      });
    }

    it('uses RSP package metadata for the AI documentation link before catalog refresh', () => {
      const metadata = sinon.stub(IMPL_COMPONENT_NAMES, 'rsp').value({
        ...IMPL_COMPONENT_NAMES.rsp,
        'prompt-field': { package: 'ai' },
      });
      try {
        const pills = buildPills('/web/rsp/components/prompt-field', {
          web: { rsp: { status: 'available' } },
        });
        expect(pills.find((pill) => pill.dataset.kind === 'dev').href).to.equal(
          'https://react-spectrum.adobe.com/ai-components.html#promptfield',
        );
      } finally {
        metadata.restore();
      }
    });
    it('deep-links to the current impl\'s own name by default (no upstreamName on the cell)', () => {
      const componentData = { web: { rsp: { status: 'available' }, figma: { status: 'available' } } };
      const pills = buildPills('/web/rsp/components/action-button', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButton.html');
    });

    it('deep-links to the real upstream name when the current impl\'s cell carries upstreamName', () => {
      // Matches the real shape deps/build-status-index.js writes (a renamed alias, e.g.
      // ActionButtonGroup -> ActionGroup, or a shared/merged page) — upstreamName lives on
      // the specific impl's own cell, not at the top of the slice.
      const componentData = {
        web: {
          rsp: { status: 'available', upstreamName: 'ActionButtonGroup' },
          figma: { status: 'available' },
        },
      };
      const pills = buildPills('/web/rsp/components/action-group', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButtonGroup.html');
    });

    it('ignores another impl\'s upstreamName — only the current impl\'s cell applies', () => {
      const componentData = {
        web: {
          swc: { status: 'available', upstreamName: 'ColorHandle' },
          rsp: { status: 'available' },
        },
      };
      const pills = buildPills('/web/rsp/components/color-handle-and-loupe', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');
      expect(dev.getAttribute('href')).to.equal(
        'https://react-spectrum.adobe.com/ColorHandleAndLoupe.html',
      );
    });

    it('returns no pills when the path does not resolve to an indexed component', () => {
      const componentData = { web: { rsp: { status: 'available' } } };
      expect(buildPills('/web/rsp/get-started', componentData)).to.deep.equal([]);
    });

    it('returns no pills when there is no component data', () => {
      expect(buildPills('/web/rsp/components/action-button', null)).to.deep.equal([]);
    });
  });

  // A design-only component's slice never carries a `design-only` key in `web` (only
  // figma/rsp/swc) — the Development/code pill must still render as Not available rather
  // than being silently omitted.
  describe('buildPills — design-only components', () => {
    it('renders Code pill as not available, with no link, when there is no code cell', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const dev = pills.find((p) => p.dataset.kind === 'dev');

      expect(dev.dataset.status).to.equal('not-available');
      expect(dev.tagName).to.equal('SPAN');
      expect(dev.querySelector('.component-status-label').textContent).to.equal('Code not available');
    });

    it('still renders the Design pill from the figma cell', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const design = pills.find((p) => p.dataset.kind === 'design');

      expect(design.dataset.status).to.equal('available');
      expect(design.querySelector('.component-status-label').textContent).to.equal('Design available');
    });

    it('links the Design pill to Figma when the slice has a figmaPageId', () => {
      const componentData = { web: { figma: { status: 'available', ...WEB_FIGMA } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);
      const design = pills.find((p) => p.dataset.kind === 'design');

      expect(design.tagName).to.equal('A');
    });

    it('renders both pills even with no code implementation ever registered for design-only', () => {
      const componentData = { web: { figma: { status: 'available' } } };
      const pills = buildPills('/web/design-only/components/alert-banner', componentData);

      expect(pills).to.have.lengthOf(2);
    });
  });

  describe('init', () => {
    let sandbox;
    let originalUrl;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
      document.body.innerHTML = '';
      resetComponentSliceCacheForTests();
      clearSessionHint();
      setConfig(SAFE_CONFIG);
      delete window.adobeIMS;
      delete window.adobeid;
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      sandbox.stub(window, 'fetch').callsFake(async (url) => {
        if (!url.toString().includes('/deps/status/action-button.json')) {
          return { ok: false };
        }
        return {
          ok: true,
          json: async () => ({
            web: {
              rsp: { status: 'available' },
              figma: { status: 'available', ...WEB_FIGMA },
            },
          }),
        };
      });
    });

    afterEach(() => {
      sandbox.restore();
      clearSessionHint();
      window.history.pushState({}, '', originalUrl);
      delete window.adobeIMS;
      delete window.adobeid;
      document.body.innerHTML = '';
    });

    for (const cdnEnv of [false, true]) {
      it(`${cdnEnv ? 'hides both' : 'renders both'} native Design pills for an anonymous ${cdnEnv ? 'CDN' : 'local'} visitor`, async () => {
        setConfig({ ...SAFE_CONFIG, cdnEnv });
        window.history.pushState({}, '', '/mobile/components/buttons');
        window.fetch.resolves({ ok: true, json: async () => MOBILE_BUTTON });
        const el = document.createElement('div');
        document.body.append(el);

        await init(el);

        expect(el.querySelectorAll('[data-kind="design"]')).to.have.lengthOf(cdnEnv ? 0 : 2);
        expect(el.querySelectorAll('[data-kind="dev"]')).to.have.lengthOf(2);
        expect(el.isConnected).to.be.true;
      });
    }

    it('removes the Design pill for an anonymous CDN visitor', async () => {
      setConfig({ ...SAFE_CONFIG, cdnEnv: true });
      const el = document.createElement('div');

      await init(el);

      expect(el.querySelector('[data-kind="dev"]')).to.exist;
      expect(el.querySelector('[data-kind="design"]') === null).to.be.true;
    });

    it('keeps the Design pill for an authenticated CDN visitor', async () => {
      setConfig({ ...SAFE_CONFIG, cdnEnv: true });
      setSessionHint();
      window.adobeIMS = {
        getAccessToken: () => ({ token: 'test-token' }),
        getProfile: async () => ({ email: 'developer@example.com' }),
      };
      const el = document.createElement('div');

      const initPromise = init(el);
      await waitFor(() => window.adobeid?.onReady);
      await window.adobeid.onReady();
      await initPromise;

      expect(el.querySelector('[data-kind="design"]')).to.exist;

      window.history.pushState({}, '', '/mobile/components/buttons#access_token=test');
      window.fetch.resolves({ ok: true, json: async () => MOBILE_BUTTON });
      const mobileEl = document.createElement('div');
      await init(mobileEl);
      expect(mobileEl.querySelectorAll('[data-kind="design"]')).to.have.lengthOf(2);
    });

    for (const mobile of [false, true]) {
      it(`hides ${mobile ? 'both native Designs' : 'Design but not Code'} and logs when IMS readiness fails`, async function test() {
        this.timeout(5000);
        setSessionHint();
        const frame = document.createElement('iframe');
        frame.src = '/test/a11y/fixtures/action-button.html';
        document.body.append(frame);
        await new Promise((resolve) => {
          frame.addEventListener('load', resolve, { once: true });
        });

        frame.contentWindow.history.pushState(
          {},
          '',
          mobile ? '/mobile/components/buttons#access_token=test'
            : '/web/rsp/components/action-button#access_token=test',
        );
        frame.contentWindow.fetch = async () => ({
          ok: true,
          json: async () => ({
            ...MOBILE_BUTTON,
            web: {
              rsp: { status: 'available' },
              figma: { status: 'available', ...WEB_FIGMA },
            },
          }),
        });
        const setup = frame.contentDocument.createElement('script');
        setup.type = 'module';
        setup.textContent = `
        window.__authFailureReady = (async () => {
          const [{ setConfig }, { default: init }] = await Promise.all([
            import('/scripts/ak.js'),
            import('/blocks/component-status/component-status.js'),
          ]);
          setConfig({
            hostnames: ['authorkit.dev'],
            components: [],
            locales: { '': { lang: 'en' } },
            cdnEnv: true,
            log: (...args) => { window.__authFailureLog = args; },
          });
          window.__authFailureEl = document.createElement('div');
          window.__authFailureInit = init(window.__authFailureEl);
        })();
      `;
        frame.contentDocument.body.append(setup);

        await waitFor(() => frame.contentWindow.__authFailureReady);
        await frame.contentWindow.__authFailureReady;
        await waitFor(() => frame.contentWindow.adobeid?.onError);
        const failure = new frame.contentWindow.Error('IMS failed');
        frame.contentWindow.adobeid.onError(failure);
        await frame.contentWindow.__authFailureInit;

        const codePill = frame.contentWindow.__authFailureEl.querySelector('[data-kind="dev"]');
        expect(codePill).to.exist;
        expect(frame.contentWindow.__authFailureEl.querySelector('[data-kind="design"]')).to.be.null;
        expect(frame.contentWindow.__authFailureLog).to.deep.equal([failure]);
      });
    }

    it('keeps the Design pill off-CDN without authentication', async () => {
      setConfig({ ...SAFE_CONFIG, cdnEnv: false });
      const el = document.createElement('div');

      await init(el);

      expect(el.querySelector('[data-kind="design"]')).to.exist;
    });
  });
});
