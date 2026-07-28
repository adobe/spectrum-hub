import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { setConfig } from '../../scripts/ak.js';

// action-button.js binds `const { log } = getConfig()` at module-load time.
// Call setConfig with a stub first, then dynamically import the module so the
// stub is captured instead of the default async error handler.
const logStub = sinon.stub();
setConfig({ log: logStub });

const {
  default: actionButton,
} = await import('../../blocks/action-button/action-button.js');

function makeAnchor({ href = '/unknown', title = 'label:Button', text = 'Click' } = {}) {
  const a = document.createElement('a');
  a.href = href;
  a.title = title;
  a.textContent = text;
  return a;
}

describe('action-button block', () => {
  afterEach(() => {
    logStub.resetHistory();
    document.body.className = '';
    document.body.innerHTML = '';
    localStorage.removeItem('color-scheme');
  });

  describe('getLinkProps — title parsing', () => {
    it('removes the title attribute from the anchor after parsing', () => {
      const a = makeAnchor({ title: 'style:quiet' });
      actionButton(a);
      expect(a.hasAttribute('title')).to.be.false;
    });

    it('parses a single key:value prop (verified via style class side-effect)', () => {
      const a = makeAnchor({ title: 'style:quiet' });
      actionButton(a);
      expect(a.classList.contains('action-button-quiet')).to.be.true;
    });

    it('parses multiple pipe-separated props', () => {
      const a = makeAnchor({ title: 'style:quiet|label:hide' });
      actionButton(a);
      expect(a.classList.contains('action-button-quiet')).to.be.true;
      expect(a.querySelector('span').classList.contains('visually-hidden')).to.be.true;
    });

    it('handles values that contain colons without throwing', () => {
      const a = makeAnchor({ title: 'data:https://example.com' });
      expect(() => actionButton(a)).to.not.throw();
      expect(a.hasAttribute('title')).to.be.false;
    });
  });

  describe('style modifier class', () => {
    it('adds action-button-{style} class when the style prop is set', () => {
      const a = makeAnchor({ title: 'style:quiet' });
      actionButton(a);
      expect(a.classList.contains('action-button-quiet')).to.be.true;
    });

    it('does not add a modifier class when the style prop is absent', () => {
      const a = makeAnchor({ title: 'label:Button' });
      actionButton(a);
      const modifiers = [...a.classList].filter((c) => c.startsWith('action-button-'));
      expect(modifiers).to.deep.equal([]);
    });
  });

  describe('text span wrapping', () => {
    it('replaces the anchor text node with a <span>', () => {
      const a = makeAnchor({ text: 'Settings' });
      actionButton(a);
      expect(a.querySelector('span')).to.not.be.null;
    });

    it('span carries the original text content', () => {
      const a = makeAnchor({ text: 'Settings' });
      actionButton(a);
      expect(a.querySelector('span').textContent).to.equal('Settings');
    });

    it('adds visually-hidden to the span when the label prop is "hide"', () => {
      const a = makeAnchor({ title: 'label:hide', text: 'Icon only' });
      actionButton(a);
      expect(a.querySelector('span').classList.contains('visually-hidden')).to.be.true;
    });

    it('does not add visually-hidden when the label prop is not "hide"', () => {
      const a = makeAnchor({ title: 'label:Button' });
      actionButton(a);
      expect(a.querySelector('span').classList.contains('visually-hidden')).to.be.false;
    });
  });

  describe('unknown pathname — stays as link', () => {
    it('does not replace the anchor with a button', () => {
      const a = makeAnchor({ href: '/some/unknown/path' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('a')).to.not.be.null;
    });

    it('does not create any <button> element', () => {
      const a = makeAnchor({ href: '/some/unknown/path' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.be.null;
    });
  });

  describe('#action — button with no click handler', () => {
    it('replaces the anchor with a <button>', () => {
      const a = makeAnchor({ href: '/tools/widgets/action#action' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.not.be.null;
      expect(document.body.querySelector('a')).to.be.null;
    });

    it('copies existing classes onto the button', () => {
      const a = makeAnchor({ href: '/tools/widgets/action#action', title: 'style:quiet' });
      a.classList.add('action-button');
      document.body.append(a);
      actionButton(a);
      const button = document.body.querySelector('button');
      expect(button.classList.contains('action-button')).to.be.true;
      expect(button.classList.contains('action-button-quiet')).to.be.true;
    });

    it('moves the text span into the button', () => {
      const a = makeAnchor({ href: '/tools/widgets/action#action', text: 'Action' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button span').textContent).to.equal('Action');
    });

    it('stamps the widget name (last path segment) onto the button as data-widget', () => {
      const a = makeAnchor({ href: '/tools/widgets/action' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button').dataset.widget).to.equal('action');
    });

    it('click does not throw (no handler is attached)', () => {
      const a = makeAnchor({ href: '/tools/widgets/action#action' });
      document.body.append(a);
      actionButton(a);
      expect(() => document.body.querySelector('button').click()).to.not.throw();
    });
  });

  describe('#scheme — color scheme toggle', () => {
    it('replaces the anchor with a <button>', () => {
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.not.be.null;
    });

    it('click switches body from light-scheme to dark-scheme', () => {
      localStorage.setItem('color-scheme', 'light-scheme');
      document.body.classList.add('light-scheme');
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(document.body.classList.contains('dark-scheme')).to.be.true;
      expect(document.body.classList.contains('light-scheme')).to.be.false;
    });

    it('click switches body from dark-scheme to light-scheme', () => {
      localStorage.setItem('color-scheme', 'dark-scheme');
      document.body.classList.add('dark-scheme');
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(document.body.classList.contains('light-scheme')).to.be.true;
      expect(document.body.classList.contains('dark-scheme')).to.be.false;
    });

    it('click persists the new scheme in localStorage', () => {
      localStorage.setItem('color-scheme', 'light-scheme');
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(localStorage.getItem('color-scheme')).to.equal('dark-scheme');
    });

    it('falls back to matchMedia when localStorage has no entry and saves the result', () => {
      expect(localStorage.getItem('color-scheme')).to.be.null;
      const matchMediaStub = sinon.stub(window, 'matchMedia').returns({ matches: true });
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      matchMediaStub.restore();
      expect(localStorage.getItem('color-scheme')).to.equal('light-scheme');
    });

    it('a synthetic click (keyboard-equivalent activation) produces the same result', () => {
      localStorage.setItem('color-scheme', 'dark-scheme');
      document.body.classList.add('dark-scheme');
      const a = makeAnchor({ href: '/tools/widgets/scheme#scheme' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      expect(document.body.classList.contains('light-scheme')).to.be.true;
    });
  });

  describe('#chat — ask ai', () => {
    it('replaces the anchor with a <button>', () => {
      const a = makeAnchor({ href: '/tools/widgets/ask-ai#chat' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.not.be.null;
    });

    it('click calls the configured log function', () => {
      const a = makeAnchor({ href: '/tools/widgets/ask-ai#chat' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(logStub.calledOnce).to.be.true;
    });

    it('click passes the expected message to log', () => {
      const a = makeAnchor({ href: '/tools/widgets/ask-ai#chat' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(logStub.calledWith('You asked AI something')).to.be.true;
    });
  });

  describe('#settings', () => {
    it('replaces the anchor with a <button>', () => {
      const a = makeAnchor({ href: '/tools/widgets/settings#settings' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.not.be.null;
    });

    it('click calls the configured log function', () => {
      const a = makeAnchor({ href: '/tools/widgets/settings#settings' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(logStub.calledOnce).to.be.true;
    });

    it('click passes the expected message to log', () => {
      const a = makeAnchor({ href: '/tools/widgets/settings#settings' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      expect(logStub.calledWith('You clicked settings')).to.be.true;
    });
  });

  // Detailed widget behavior (Turndown conversion, Figma URL resolution, impl
  // URL mapping) is unit-tested against each code-split module directly — see
  // test/blocks/copy-md.test.js, test/blocks/go-to-impl.test.js and
  // test/blocks/figma.test.js. These dispatch tests only verify that
  // action-button.js routes to the right widget and lazily loads its module.

  describe('/tools/widgets/copy-markdown — code-split dispatch', () => {
    let fetchStub;
    let clipboardStub;

    beforeEach(() => {
      fetchStub = sinon.stub(window, 'fetch').resolves({
        ok: true,
        text: async () => '# Page markdown',
      });
      clipboardStub = sinon.stub(navigator.clipboard, 'writeText').resolves();
    });

    afterEach(() => {
      fetchStub.restore();
      clipboardStub.restore();
    });

    it('replaces the anchor with a <button>', () => {
      const a = makeAnchor({ href: '/tools/widgets/copy-markdown', text: 'Copy markdown' });
      document.body.append(a);
      actionButton(a);
      expect(document.body.querySelector('button')).to.not.be.null;
      expect(document.body.querySelector('a')).to.be.null;
    });

    it('click lazily loads copy-md.js and copies the page markdown to the clipboard', async () => {
      const a = makeAnchor({ href: '/tools/widgets/copy-markdown', text: 'Copy markdown' });
      document.body.append(a);
      actionButton(a);
      document.body.querySelector('button').click();
      // The dynamic import() of copy-md.js and its requestAnimationFrame-based
      // wait for in-flight sections are real (not fake-timer-controlled), so
      // poll for the clipboard call rather than a single microtask flush.
      await new Promise((resolve, reject) => {
        const start = Date.now();
        (function poll() {
          if (clipboardStub.called) {
            resolve();
            return;
          }
          if (Date.now() - start > 2000) {
            reject(new Error('timed out waiting for clipboard write'));
            return;
          }
          setTimeout(poll, 10);
        }());
      });
      expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
    });
  });

  describe('/tools/widgets/go-to-impl — link widget dispatch', () => {
    let originalUrl;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
    });

    afterEach(() => {
      window.history.pushState({}, '', originalUrl);
    });

    it('stays an anchor and deep-links to the resolved implementation', async () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor({ href: '/tools/widgets/go-to-impl', text: 'Go to implementation' });
      document.body.append(a);
      await actionButton(a);
      expect(document.body.querySelector('button')).to.be.null;
      const link = document.body.querySelector('[data-widget="go-to-impl"]');
      expect(link).to.not.be.null;
      expect(link.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
    });

    it('removes itself when the page is not a component page', async () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      const a = makeAnchor({ href: '/tools/widgets/go-to-impl', text: 'Go to implementation' });
      document.body.append(a);
      await actionButton(a);
      expect(document.body.querySelector('[data-widget="go-to-impl"]')).to.be.null;
    });
  });

  describe('/tools/widgets/see-in-figma — link widget dispatch', () => {
    let originalUrl;
    let fetchStub;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
      fetchStub = sinon.stub(window, 'fetch');
    });

    afterEach(() => {
      fetchStub.restore();
      window.history.pushState({}, '', originalUrl);
    });

    it('stays an anchor and deep-links to the resolved Figma frame', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => [{ name: 'Action button', figmaPageId: '9230:3620' }],
      });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor({ href: '/tools/widgets/see-in-figma', text: 'See in Figma' });
      document.body.append(a);
      await actionButton(a);
      expect(document.body.querySelector('button')).to.be.null;
      const link = document.body.querySelector('[data-widget="see-in-figma"]');
      expect(link).to.not.be.null;
      expect(link.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
    });

    it('removes itself when the component has no Figma entry', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => [{ name: 'Accordion', figmaPageId: '10093:987' }],
      });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeAnchor({ href: '/tools/widgets/see-in-figma', text: 'See in Figma' });
      document.body.append(a);
      await actionButton(a);
      expect(document.body.querySelector('[data-widget="see-in-figma"]')).to.be.null;
    });
  });
});
