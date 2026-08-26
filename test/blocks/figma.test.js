import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { figmaNodeUrl, decorateSeeInFigma } from '../../scripts/utils/figma.js';

function makeAnchor(text = 'See in Figma') {
  const a = document.createElement('a');
  const span = document.createElement('span');
  span.textContent = text;
  a.append(span);
  document.body.append(a);
  return a;
}

describe('figma block', () => {
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
  });

  describe('decorateSeeInFigma', () => {
    let originalUrl;
    let fetchStub;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
      fetchStub = sinon.stub(window, 'fetch');
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
      stubComponentSlice({ web: {}, figmaPageId: '9230:3620' });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(fetchStub.firstCall.args[0]).to.contain('/deps/status/action-button.json');
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
      expect(a.querySelector('span').textContent).to.equal('See in Figma');
    });

    it('deep-links to a `web.figma.originalName` override\'s redirected Figma node', async () => {
      // deps/build-status-index.js resolves the override into the slice's figmaPageId
      // build-time — the widget just trusts whatever node id the slice carries.
      stubComponentSlice({
        web: { figma: { status: 'available', originalName: 'Date and time field' } },
        figmaPageId: '10196:3411',
      });
      window.history.pushState({}, '', '/web/rsp/components/calendar');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=10196-3411&m=dev',
      );
    });

    it('removes itself when the slice has no figmaPageId', async () => {
      stubComponentSlice({ web: {} });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
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
