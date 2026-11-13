import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { figmaNodeUrl, decorateSeeInFigma } from '../../scripts/utils/figma.js';
import { resetComponentSliceCacheForTests } from '../../scripts/utils/component-slice.js';
import { FIGMA_SOURCES } from '../../scripts/utils/figma-sources.js';
import { getConfig } from '../../scripts/ak.js';

function makeAnchor(text = 'See in Figma') {
  const a = document.createElement('a');
  const span = document.createElement('span');
  span.textContent = text;
  a.append(span);
  document.body.append(a);
  return a;
}

describe('figma block', () => {
  let logStub;

  beforeEach(() => {
    logStub = sinon.stub(getConfig(), 'log');
  });

  afterEach(() => {
    logStub.restore();
  });

  describe('figmaNodeUrl — Figma page id → dev-mode URL', () => {
    it('builds a dev-mode URL with the node id hyphenated', () => {
      expect(figmaNodeUrl('9230:3620')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
    });

    it('returns null for a falsy page id', () => {
      expect(figmaNodeUrl(undefined)).to.equal(null);
      expect(figmaNodeUrl('')).to.equal(null);
    });

    for (const source of FIGMA_SOURCES) {
      it(`links to the registered ${source.id} file`, () => {
        expect(figmaNodeUrl('1:2', source.id, source.fileKey)).to.equal(
          `https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=1-2&m=dev`,
        );
      });
    }

    it('does not guess a file for an unknown source or mismatched file', () => {
      expect(figmaNodeUrl('1:2', 'unknown', 'wrong')).to.equal(null);
      expect(figmaNodeUrl('1:2', 's2-ios', FIGMA_SOURCES[0].fileKey)).to.equal(null);
      expect(logStub.callCount).to.equal(2);
      expect(logStub.firstCall.args[0]).to.be.instanceOf(Error);
    });
  });

  describe('decorateSeeInFigma', () => {
    let originalUrl;
    let fetchStub;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
      fetchStub = sinon.stub(window, 'fetch');
      resetComponentSliceCacheForTests();
    });

    afterEach(() => {
      fetchStub.restore();
      window.history.pushState({}, '', originalUrl);
      document.body.innerHTML = '';
    });

    function stubComponentSlice(data) {
      fetchStub.resolves({ ok: true, json: async () => data });
    }

    it('deep-links to the component Figma node in dev mode, in a new tab', async () => {
      stubComponentSlice({
        web: {
          figma: {
            figmaSource: 's2-web', figmaFile: FIGMA_SOURCES[0].fileKey, figmaPageId: '9230:3620',
          },
        },
      });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/action-button.json');
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
      expect(a.getAttribute('aria-label')).to.equal(
        'See in Figma. Opens action-button in a new tab.',
      );
      expect(a.querySelector('span').textContent).to.equal('See in Figma');
    });

    it('uses the selected AI Toolkit reference for a nested pattern page', async () => {
      const source = FIGMA_SOURCES.find(({ id }) => id === 'ai-toolkit');
      stubComponentSlice({
        web: {
          figma: {
            status: 'available',
            figmaSource: source.id,
            figmaFile: source.fileKey,
            figmaPageId: '1:2',
          },
        },
      });
      window.history.pushState({}, '', '/web/swc/patterns/conversational-ai/response-status');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/response-status.json');
      expect(a.href).to.equal(
        `https://www.figma.com/design/${source.fileKey}/${source.urlName}?node-id=1-2&m=dev`,
      );
      expect(a.getAttribute('aria-label')).to.equal('See in Figma. Opens response-status in a new tab.');
    });

    it('deep-links to a `web.figma.figmaPageSource` override\'s redirected Figma node', async () => {
      // deps/build-status-index.js resolves the override into the slice's figmaPageId
      // build-time — the widget just trusts whatever node id the slice carries.
      stubComponentSlice({
        web: {
          figma: {
            status: 'available',
            figmaPageSource: 'Date and time field',
            figmaSource: 's2-web',
            figmaFile: FIGMA_SOURCES[0].fileKey,
            figmaPageId: '10196:3411',
          },
        },
      });
      window.history.pushState({}, '', '/web/rsp/components/calendar');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=10196-3411&m=dev',
      );
      expect(a.getAttribute('aria-label')).to.equal(
        'See in Figma. Opens Date and time field in a new tab.',
      );
    });

    it('removes itself when the slice has no figmaPageId', async () => {
      stubComponentSlice({ web: {} });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    for (const source of FIGMA_SOURCES) {
      it(`uses the ${source.platform} page's ${source.id} reference`, async () => {
        stubComponentSlice({
          [source.platform]: {
            figma: {
              status: 'available',
              figmaSource: source.id,
              figmaFile: source.fileKey,
              figmaPageId: '1:2',
            },
          },
        });
        const path = source.platform === 'web' ? '/web/rsp' : `/mobile/${source.platform}`;
        window.history.pushState({}, '', `${path}/components/button`);
        const a = makeAnchor();
        await decorateSeeInFigma(a, a.querySelector('span'));
        expect(a.href).to.contain(`/design/${source.fileKey}/`);
        expect(a.getAttribute('aria-label')).to.equal('See in Figma. Opens button in a new tab.');
      });
    }

    it('does not use a web reference on an iOS page', async () => {
      stubComponentSlice({
        web: {
          figma: {
            figmaSource: 's2-web', figmaFile: FIGMA_SOURCES[0].fileKey, figmaPageId: '1:2',
          },
        },
      });
      window.history.pushState({}, '', '/mobile/ios/components/button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    it('renders platform-labelled native actions using the canonical Button slice', async () => {
      stubComponentSlice({
        web: {
          figma: {
            figmaSource: 's2-web', figmaFile: FIGMA_SOURCES[0].fileKey, figmaPageId: '1:2',
          },
        },
        ios: {
          figma: {
            figmaSource: 's2-ios', figmaFile: 'OQExiy8bX0pRqee71eAWX6', figmaPageId: '3956:67276',
          },
        },
        android: {
          figma: {
            figmaSource: 's2-android', figmaFile: 'Yzbd4jgLTo6KhEPZKwv1WA', figmaPageId: '2002:3805',
          },
        },
      });
      window.history.pushState({}, '', '/mobile/components/buttons');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/button.json');
      const links = [...document.querySelectorAll('a')];
      expect(links.map((link) => link.textContent)).to.deep.equal([
        'See iOS in Figma', 'See Android in Figma',
      ]);
      expect(links.map((link) => link.getAttribute('href'))).to.deep.equal([
        'https://www.figma.com/design/OQExiy8bX0pRqee71eAWX6/S2---iOS?node-id=3956-67276&m=dev',
        'https://www.figma.com/design/Yzbd4jgLTo6KhEPZKwv1WA/S2---Android?node-id=2002-3805&m=dev',
      ]);
      expect(links.every((link) => link.target === '_blank'
        && link.rel === 'noopener noreferrer'
        && link.getAttribute('aria-label').includes(link.textContent))).to.be.true;
    });

    it('does not substitute web when a shared mobile page is missing a native design', async () => {
      stubComponentSlice({
        web: {
          figma: {
            figmaSource: 's2-web', figmaFile: FIGMA_SOURCES[0].fileKey, figmaPageId: '1:2',
          },
        },
        ios: {
          figma: {
            figmaSource: 's2-ios', figmaFile: 'OQExiy8bX0pRqee71eAWX6', figmaPageId: '3956:67276',
          },
        },
      });
      window.history.pushState({}, '', '/mobile/components/buttons');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      const links = [...document.querySelectorAll('a')];
      expect(links).to.have.lengthOf(1);
      expect(links[0].textContent).to.equal('See iOS in Figma');
      expect(links[0].href).to.contain('/OQExiy8bX0pRqee71eAWX6/');
    });

    it('rejects a web source stored on the native platform cell', async () => {
      stubComponentSlice({
        ios: {
          figma: {
            figmaSource: 's2-web', figmaFile: FIGMA_SOURCES[0].fileKey, figmaPageId: '1:2',
          },
        },
      });
      window.history.pushState({}, '', '/mobile/ios/components/button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0].message).to.contain('Invalid Figma reference for ios/button');
    });

    it('removes itself when the slice cannot be fetched', async () => {
      fetchStub.resolves({ ok: false, status: 404 });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    it('removes itself (and skips the fetch) when not on a component page', async () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
      expect(fetchStub.called).to.be.false;
    });
  });
});
