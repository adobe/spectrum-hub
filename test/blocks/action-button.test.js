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
  resolveImplementation,
  resolveFigmaUrl,
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

  describe('/tools/widgets/copy-markdown', () => {
    let fetchStub;
    let clipboardStub;
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      fetchStub = sinon.stub(window, 'fetch').resolves({
        ok: true,
        text: async () => '# Page markdown',
      });
      clipboardStub = sinon.stub(navigator.clipboard, 'writeText').resolves();
    });

    afterEach(() => {
      fetchStub.restore();
      clipboardStub.restore();
      clock.restore();
    });

    function makeCopyButton() {
      const a = makeAnchor({ href: '/tools/widgets/copy-markdown', text: 'Copy markdown' });
      document.body.append(a);
      actionButton(a);
      return document.body.querySelector('button');
    }

    it('replaces the anchor with a <button>', () => {
      const button = makeCopyButton();
      expect(button).to.not.be.null;
      expect(document.body.querySelector('a')).to.be.null;
    });

    it('fetches the current page markdown (pathname + .md)', async () => {
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.match(/\.md$/);
    });

    it('writes the fetched markdown to the clipboard', async () => {
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
    });

    it('flashes "Copied" on success', async () => {
      const button = makeCopyButton();
      button.click();
      await clock.tickAsync(0);
      expect(button.querySelector('span').textContent).to.equal('Copied');
      expect(button.classList.contains('is-copied')).to.be.true;
    });

    it('reverts to the original label after 3s', async () => {
      const button = makeCopyButton();
      button.click();
      await clock.tickAsync(0);
      await clock.tickAsync(3000);
      expect(button.querySelector('span').textContent).to.equal('Copy markdown');
      expect(button.classList.contains('is-copied')).to.be.false;
    });

    it('flashes "Copy failed" and skips the clipboard when the fetch fails', async () => {
      fetchStub.resolves({ ok: false, status: 404 });
      const button = makeCopyButton();
      button.click();
      await clock.tickAsync(0);
      expect(button.querySelector('span').textContent).to.equal('Copy failed');
      expect(clipboardStub.called).to.be.false;
    });

    it('flashes "Copy failed" when writing to the clipboard rejects', async () => {
      clipboardStub.rejects(new Error('denied'));
      const button = makeCopyButton();
      button.click();
      await clock.tickAsync(0);
      expect(button.querySelector('span').textContent).to.equal('Copy failed');
    });

    // Authored icons render as <svg class="icon icon-<name>"><use href=".../
    // s2-icon-<name>-20-n.svg#icon"></use></svg> (see scripts/utils/svg.js).
    function makeCopyButtonWithIcon(iconName = 'copy') {
      const a = makeAnchor({ href: '/tools/widgets/copy-markdown', text: 'Copy markdown' });
      a.insertAdjacentHTML(
        'afterbegin',
        `<svg class="icon icon-${iconName}"><use href="/img/icons/s2-icon-${iconName}-20-n.svg#icon"></use></svg>`,
      );
      document.body.append(a);
      actionButton(a);
      return document.body.querySelector('button');
    }

    const iconHref = (button) => button.querySelector('svg.icon use').getAttribute('href');

    it('swaps the authored icon to the checkmark icon on success', async () => {
      const button = makeCopyButtonWithIcon();
      button.click();
      await clock.tickAsync(0);
      expect(iconHref(button)).to.equal('/img/icons/s2-icon-checkmarkcircle-20-n.svg#icon');
    });

    it('restores the original icon after the revert delay', async () => {
      const button = makeCopyButtonWithIcon();
      button.click();
      await clock.tickAsync(0);
      await clock.tickAsync(3000);
      expect(iconHref(button)).to.equal('/img/icons/s2-icon-copy-20-n.svg#icon');
    });

    it('preserves a multi-word authored icon name when reverting', async () => {
      const button = makeCopyButtonWithIcon('copy-outline');
      button.click();
      await clock.tickAsync(0);
      expect(iconHref(button)).to.equal('/img/icons/s2-icon-checkmarkcircle-20-n.svg#icon');
      await clock.tickAsync(3000);
      expect(iconHref(button)).to.equal('/img/icons/s2-icon-copy-outline-20-n.svg#icon');
    });

    it('leaves the icon unchanged when the copy fails', async () => {
      fetchStub.resolves({ ok: false, status: 404 });
      const button = makeCopyButtonWithIcon();
      button.click();
      await clock.tickAsync(0);
      expect(iconHref(button)).to.equal('/img/icons/s2-icon-copy-20-n.svg#icon');
    });

    it('does not throw for a label-only button with no icon', async () => {
      const button = makeCopyButton();
      button.click();
      await clock.tickAsync(0);
      expect(button.querySelector('span').textContent).to.equal('Copied');
    });

    describe('primary path — Turndown conversion of <main>', () => {
      beforeEach(() => { clock.restore(); });

      async function waitFor(fn, { timeout = 2000, interval = 20 } = {}) {
        const start = Date.now();
        while (!fn()) {
          if (Date.now() - start > timeout) { throw new Error('waitFor timed out'); }
          await new Promise((resolve) => { setTimeout(resolve, interval); });
        }
      }

      function setMain(html) {
        const main = document.createElement('main');
        main.innerHTML = html;
        document.body.append(main);
        return main;
      }

      it('converts <main> to Markdown via Turndown and skips the .md fetch', async () => {
        setMain('<h1>Title</h1><p>Hello <strong>world</strong></p>');
        makeCopyButton().click();
        await waitFor(() => clipboardStub.called);
        expect(fetchStub.called).to.be.false;
        const markdown = clipboardStub.firstCall.args[0];
        expect(markdown).to.include('# Title');
        expect(markdown).to.include('Hello **world**');
      });

      it('converts a table using GFM syntax', async () => {
        setMain('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>');
        makeCopyButton().click();
        await waitFor(() => clipboardStub.called);
        expect(clipboardStub.firstCall.args[0]).to.include('| A | B |');
      });

      it('strips elements carrying [data-widget] from the copied Markdown', async () => {
        setMain('<h1>Title</h1><span data-widget="copy-markdown">Copy markdown</span>');
        makeCopyButton().click();
        await waitFor(() => clipboardStub.called);
        expect(clipboardStub.firstCall.args[0]).to.not.include('Copy markdown');
      });

      it('falls back to the .md fetch when there is no <main>', async () => {
        makeCopyButton().click();
        await waitFor(() => clipboardStub.called);
        expect(fetchStub.calledOnce).to.be.true;
        expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
      });

      it('waits for in-flight sections before reading <main>', async () => {
        setMain('<h1>Loaded</h1>');
        const section = document.createElement('div');
        section.dataset.status = 'decorated';
        document.body.append(section);

        makeCopyButton().click();
        await new Promise((resolve) => { setTimeout(resolve, 50); });
        expect(clipboardStub.called).to.be.false;

        delete section.dataset.status;
        await waitFor(() => clipboardStub.called);
        expect(clipboardStub.firstCall.args[0]).to.include('# Loaded');
      });
    });
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

  describe('/tools/widgets/go-to-impl — link widget', () => {
    let originalUrl;

    beforeEach(() => {
      originalUrl = window.location.pathname + window.location.search + window.location.hash;
    });

    afterEach(() => {
      window.history.pushState({}, '', originalUrl);
    });

    function makeGoToImpl() {
      const a = makeAnchor({ href: '/tools/widgets/go-to-impl', text: 'Go to implementation' });
      document.body.append(a);
      actionButton(a);
      return document.body.querySelector('[data-widget="go-to-impl"]');
    }

    it('stays an anchor (never converted to a button)', () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      makeGoToImpl();
      expect(document.body.querySelector('button')).to.be.null;
      expect(document.body.querySelector('a[data-widget="go-to-impl"]')).to.not.be.null;
    });

    it('sets the SWC label and deep-links to the SWC docs in a new tab', () => {
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = makeGoToImpl();
      expect(a.querySelector('span').textContent).to.equal('Go to SWC');
      expect(a.getAttribute('href')).to.equal(
        'https://spectrum-web-components.adobe.com/?path=/docs/components-action-button--docs',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
    });

    it('sets the RSP label and a PascalCase deep-link', () => {
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      const a = makeGoToImpl();
      expect(a.querySelector('span').textContent).to.equal('Go to RSP');
      expect(a.getAttribute('href')).to.equal('https://react-spectrum.adobe.com/ActionButton.html');
    });

    it('removes itself when the page is not a component page', () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      makeGoToImpl();
      expect(document.body.querySelector('[data-widget="go-to-impl"]')).to.be.null;
    });

    it('removes itself when the implementation is unknown', () => {
      window.history.pushState({}, '', '/web/ios/components/button');
      makeGoToImpl();
      expect(document.body.querySelector('[data-widget="go-to-impl"]')).to.be.null;
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

  describe('/tools/widgets/see-in-figma — link widget', () => {
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

    function stubFigmaData(rows) {
      fetchStub.resolves({ ok: true, json: async () => rows });
    }

    async function makeSeeInFigma() {
      const a = makeAnchor({ href: '/tools/widgets/see-in-figma', text: 'See in Figma' });
      document.body.append(a);
      await actionButton(a);
      return document.body.querySelector('[data-widget="see-in-figma"]');
    }

    it('deep-links to the component Figma node in dev mode, in a new tab', async () => {
      stubFigmaData([{ name: 'Action button', figmaPageId: '9230:3620' }]);
      window.history.pushState({}, '', '/web/swc/components/action-button');
      const a = await makeSeeInFigma();
      expect(a).to.not.be.null;
      expect(a.getAttribute('href')).to.equal(
        'https://www.figma.com/design/xHBWBBIe2eo5vwoCeNrC4Q/S2---Web?node-id=9230-3620&m=dev',
      );
      expect(a.target).to.equal('_blank');
      expect(a.rel).to.equal('noopener noreferrer');
      expect(a.querySelector('span').textContent).to.equal('See in Figma');
    });

    it('stays an anchor (never converted to a button)', async () => {
      stubFigmaData([{ name: 'Action button', figmaPageId: '9230:3620' }]);
      window.history.pushState({}, '', '/web/rsp/components/action-button');
      await makeSeeInFigma();
      expect(document.body.querySelector('button')).to.be.null;
      expect(document.body.querySelector('a[data-widget="see-in-figma"]')).to.not.be.null;
    });

    it('removes itself when the component has no Figma entry', async () => {
      stubFigmaData([{ name: 'Accordion', figmaPageId: '10093:987' }]);
      window.history.pushState({}, '', '/web/swc/components/action-button');
      await makeSeeInFigma();
      expect(document.body.querySelector('[data-widget="see-in-figma"]')).to.be.null;
    });

    it('removes itself when the data file cannot be fetched', async () => {
      fetchStub.resolves({ ok: false, status: 404 });
      window.history.pushState({}, '', '/web/swc/components/action-button');
      await makeSeeInFigma();
      expect(document.body.querySelector('[data-widget="see-in-figma"]')).to.be.null;
    });

    it('removes itself (and skips the fetch) when not on a component page', async () => {
      window.history.pushState({}, '', '/web/swc/get-started');
      await makeSeeInFigma();
      expect(document.body.querySelector('[data-widget="see-in-figma"]')).to.be.null;
      expect(fetchStub.called).to.be.false;
    });
  });
});
