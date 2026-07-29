import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const { handleCopyMarkdown, turndownLoader } = await import('../../scripts/utils/copy-md.js');

function makeCopyButton(text = 'Copy markdown') {
  const button = document.createElement('button');
  const span = document.createElement('span');
  span.textContent = text;
  button.append(span);
  button.addEventListener('click', handleCopyMarkdown);
  document.body.append(button);
  return button;
}

// Authored icons render as <svg class="icon icon-<name>"><use href=".../
// s2-icon-<name>-20-n.svg#icon"></use></svg> (see scripts/utils/svg.js).
function makeCopyButtonWithIcon(iconName = 'copy') {
  const button = makeCopyButton();
  button.insertAdjacentHTML(
    'afterbegin',
    `<svg class="icon icon-${iconName}"><use href="/img/icons/s2-icon-${iconName}-20-n.svg#icon"></use></svg>`,
  );
  return button;
}

const iconHref = (button) => button.querySelector('svg.icon use').getAttribute('href');

describe('copy-md block', () => {
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
    document.body.innerHTML = '';
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

  it('marks the label as a live region so the status is announced without moving focus', async () => {
    const button = makeCopyButton();
    button.click();
    await clock.tickAsync(0);
    const label = button.querySelector('span');
    expect(label.getAttribute('aria-live')).to.equal('polite');
    expect(label.getAttribute('aria-atomic')).to.equal('true');
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
    // Stub the loader rather than letting pageMarkdown() actually fetch/run
    const FAKE_GFM = Symbol('gfm');
    let loaderStub;
    let lastInstance;

    class FakeTurndownService {
      constructor(options) {
        this.options = options;
        this.plugins = [];
        lastInstance = this;
      }

      use(plugin) { this.plugins.push(plugin); }

      turndown(html) { return `MARKDOWN(${html})`; }
    }

    beforeEach(() => {
      lastInstance = undefined;
      loaderStub = sinon.stub(turndownLoader, 'load').resolves({
        TurndownService: FakeTurndownService,
        gfm: FAKE_GFM,
      });
    });

    afterEach(() => {
      loaderStub.restore();
    });

    function setMain(html) {
      const main = document.createElement('main');
      main.innerHTML = html;
      document.body.append(main);
      return main;
    }

    it('calls the Turndown loader and writes its output to the clipboard', async () => {
      setMain('<h1>Title</h1>');
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(loaderStub.calledOnce).to.be.true;
      expect(fetchStub.called).to.be.false;
      expect(clipboardStub.calledOnceWith('MARKDOWN(<h1>Title</h1>)')).to.be.true;
    });

    it('registers the GFM plugin on the Turndown instance', async () => {
      setMain('<h1>Title</h1>');
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(lastInstance.plugins).to.include(FAKE_GFM);
    });

    it('strips elements carrying [data-widget] before conversion', async () => {
      setMain('<h1>Title</h1><span data-widget="copy-markdown">Copy markdown</span>');
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(clipboardStub.firstCall.args[0]).to.equal('MARKDOWN(<h1>Title</h1>)');
    });

    it('falls back to the .md fetch when there is no <main> (and never calls the loader)', async () => {
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(loaderStub.called).to.be.false;
      expect(fetchStub.calledOnce).to.be.true;
      expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
    });

    it('falls back to the .md fetch when the Turndown loader rejects', async () => {
      loaderStub.rejects(new Error('network error'));
      setMain('<h1>Title</h1>');
      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(fetchStub.calledOnce).to.be.true;
      expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
    });

    it('waits for in-flight sections before reading <main>', async () => {
      setMain('<h1>Loaded</h1>');
      const section = document.createElement('div');
      section.dataset.status = 'decorated';
      document.body.append(section);

      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(clipboardStub.called).to.be.false;

      delete section.dataset.status;
      await clock.tickAsync(100);
      expect(clipboardStub.calledOnceWith('MARKDOWN(<h1>Loaded</h1>)')).to.be.true;
    });

    it('falls back to the .md fetch (and disconnects its observer) if a section never finishes decorating', async () => {
      const disconnectSpy = sinon.spy(MutationObserver.prototype, 'disconnect');
      setMain('<h1>Loaded</h1>');
      const section = document.createElement('div');
      section.dataset.status = 'decorated'; // intentionally never cleared
      document.body.append(section);

      makeCopyButton().click();
      await clock.tickAsync(0);
      expect(clipboardStub.called).to.be.false;

      await clock.tickAsync(8000);
      expect(loaderStub.called).to.be.false;
      expect(fetchStub.calledOnce).to.be.true;
      expect(clipboardStub.calledOnceWith('# Page markdown')).to.be.true;
      expect(disconnectSpy.calledOnce).to.be.true;

      disconnectSpy.restore();
    });
  });
});
