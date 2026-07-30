import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { figmaNodeUrl, resolveFigmaUrl, decorateSeeInFigma } from '../../scripts/utils/figma.js';

function makeAnchor(text = 'See in Figma') {
  const a = document.createElement('a');
  const span = document.createElement('span');
  span.textContent = text;
  a.append(span);
  document.body.append(a);
  return a;
}

describe('figma block', () => {
  describe('figmaNodeUrl — node id → Figma dev-mode URL', () => {
    it('builds a dev-mode URL with the node id hyphenated', () => {
      expect(figmaNodeUrl('9230:3620')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
    });

    it('returns null for a missing id', () => {
      expect(figmaNodeUrl(undefined)).to.equal(null);
      expect(figmaNodeUrl(null)).to.equal(null);
    });
  });

  describe('resolveFigmaUrl — component slug → Figma dev-mode URL', () => {
    const data = [
      { name: 'Accordion', figmaPageId: '10093:987' },
      { name: 'Action bar', figmaPageId: '9892:747' },
      { name: 'Action button', figmaPageId: '9230:3620' },
    ];

    it('builds a dev-mode URL with the node id hyphenated', () => {
      expect(resolveFigmaUrl('action-button', data)).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
    });

    it('matches the URL slug against the slugified component name', () => {
      expect(resolveFigmaUrl('action-bar', data)).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9892-747&m=dev',
      );
    });

    it('returns null when the component is absent from the data', () => {
      expect(resolveFigmaUrl('nonexistent', data)).to.equal(null);
    });

    it('returns null for an empty component slug', () => {
      expect(resolveFigmaUrl('', data)).to.equal(null);
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

    function stubFigmaData(rows) {
      fetchStub.resolves({ ok: true, json: async () => rows });
    }

    it('deep-links to the component Figma node in dev mode, in a new tab', async () => {
      stubFigmaData([{ name: 'Action button', figmaPageId: '9230:3620' }]);
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
      expect(a.querySelector('span').textContent).to.equal('See in Figma');
    });

    it('removes itself when the component has no Figma entry', async () => {
      stubFigmaData([{ name: 'Accordion', figmaPageId: '10093:987' }]);
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor();
      await decorateSeeInFigma(a, a.querySelector('span'));
      expect(a.isConnected).to.be.false;
    });

    it('removes itself when the data file cannot be fetched', async () => {
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
