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
  describe('native Design pills', () => {
    for (const source of FIGMA_SOURCES.filter((entry) => entry.platform !== 'web')) {
      it(`renders only the ${source.platform} Design pill, with its own file`, () => {
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
        });
        expect(pills).to.have.lengthOf(1);
        expect(pills[0].dataset.kind).to.equal('design');
        expect(pills[0].href).to.contain(`/design/${source.fileKey}/`);
      });
    }

    it('does not invent native Code or Design status from a web-only slice', () => {
      expect(buildPills('/mobile/ios/components/button', {
        web: { figma: { status: 'available' } },
      })).to.deep.equal([]);
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
    });

    it('uses the AI package documentation for an AI component', () => {
      const pills = buildPills('/web/rsp/components/prompt-field', {
        web: { rsp: { status: 'available' } },
      });
      expect(pills.find((pill) => pill.dataset.kind === 'dev').href).to.equal(
        'https://react-spectrum.adobe.com/ai-components.html#promptfield',
      );
    });
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
    });

    it('renders only Code and logs when IMS readiness fails for an active CDN session', async function test() {
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
        '/web/rsp/components/action-button#access_token=test',
      );
      frame.contentWindow.fetch = async () => ({
        ok: true,
        json: async () => ({
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

      expect(frame.contentWindow.__authFailureEl.querySelector('[data-kind="dev"]')).to.exist;
      expect(frame.contentWindow.__authFailureEl.querySelector('[data-kind="design"]')).to.be.null;
      expect(frame.contentWindow.__authFailureLog).to.deep.equal([failure]);
    });

    it('keeps the Design pill off-CDN without authentication', async () => {
      setConfig({ ...SAFE_CONFIG, cdnEnv: false });
      const el = document.createElement('div');

      await init(el);

      expect(el.querySelector('[data-kind="design"]')).to.exist;
    });
  });
});
