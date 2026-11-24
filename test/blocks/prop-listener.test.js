import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import * as preview from '../../deps/shared/playground/prop-listener.js';

const { listenForPropUpdates, notifyPreviewReady, requestMarkup } = preview;

// listenForPropUpdates wires a window 'message' listener; message events are
// delivered synchronously via dispatchEvent, so no awaiting is needed.
function send(data, options = {}) {
  window.dispatchEvent(new MessageEvent('message', {
    data,
    source: window.parent,
    origin: window.location.origin,
    ...options,
  }));
}

describe('executeSnippetScripts', () => {
  it('executes inline scripts parsed through innerHTML', () => {
    expect(preview.executeSnippetScripts).to.be.a('function');

    const mount = document.createElement('div');
    mount.innerHTML = '<script>document.currentScript.parentElement.dataset.executed = "true";</script>';
    document.body.append(mount);

    try {
      preview.executeSnippetScripts(mount);
      expect(mount.dataset.executed).to.equal('true');
    } finally {
      mount.remove();
    }
  });

  it('switches the conversation-turn message element and text with its type', async () => {
    const markup = await (await fetch('/deps/swc/playground/snippets/conversation-turn.html')).text();
    const mount = document.createElement('div');
    mount.innerHTML = markup;
    document.body.append(mount);

    try {
      preview.executeSnippetScripts(mount);
      const turn = mount.querySelector('swc-conversation-turn');
      const userMessage = turn.querySelector('swc-user-message');
      const texts = {
        user: 'Can you summarize the attached campaign assets?',
        system: 'Here is a concise summary based on the files you shared. I grouped themes by audience and channel.',
      };

      for (const type of ['user', 'system', 'system', 'user', 'system', 'user']) {
        turn.setAttribute('type', type);
        await new Promise((resolve) => {
          setTimeout(resolve);
        });
        const messages = turn.querySelectorAll('swc-user-message, swc-system-message');
        expect(messages).to.have.length(1);
        expect(messages[0].localName).to.equal(`swc-${type}-message`);
        expect(messages[0].textContent.trim()).to.equal(texts[type]);
      }
      expect(turn.querySelector('swc-user-message')).to.equal(userMessage);
    } finally {
      mount.remove();
    }
  });

  it('updates the response-status label and timeline when its status changes', async () => {
    expect(preview.executeSnippetScripts).to.be.a('function');

    const sandbox = sinon.createSandbox();
    // The unbundled SWC source expects this build-time environment variable.
    sandbox.define(window, 'process', { env: { NODE_ENV: 'production' } });
    const mount = document.createElement('div');
    try {
      /* eslint-disable import/no-unresolved -- SWC's wildcard ESM exports confuse the resolver. */
      await import('@adobe/spectrum-wc/patterns/ai-toolkit/response-status/swc-response-status.js');
      await import('@adobe/spectrum-wc/patterns/ai-toolkit/response-status/response-status-step/swc-response-status-step.js');
      /* eslint-enable import/no-unresolved */
      mount.innerHTML = await (await fetch('/deps/swc/playground/snippets/response-status.html')).text();
      document.body.append(mount);
      preview.executeSnippetScripts(mount);

      const responseStatus = mount.querySelector('swc-response-status');
      const label = responseStatus.querySelector('[slot="label"]');
      const descriptions = {
        active: 'Checked 3 internal repositories for previously compiled trip package data and pricing templates.',
        complete: 'Synthesizing findings into a structured comparison of available packages with pricing and availability.',
        stopped: 'Interrupted before this step could finish.',
      };
      const statuses = [
        ['active', 'Searching repositories for Europe trips'],
        ['complete', 'Thought for 9 seconds'],
        ['complete', 'Thought for 9 seconds'],
        ['stopped', 'You stopped the response'],
        ['complete', 'Thought for 9 seconds'],
        ['active', 'Searching repositories for Europe trips'],
        ['stopped', 'You stopped the response'],
      ];

      for (const [status, expectedLabel] of statuses) {
        responseStatus.setAttribute('status', status);
        await new Promise((resolve) => {
          setTimeout(resolve);
        });
        expect(label.textContent).to.equal(expectedLabel);
        const steps = [...responseStatus.querySelectorAll('swc-response-status-step')];
        expect(steps).to.have.length(status === 'complete' ? 4 : 3);
        expect(steps.at(-1).querySelector('[slot="label"]').textContent).to.equal(
          status === 'complete' ? 'Compose response' : 'Searching repositories for Europe trips',
        );
        expect(steps.map((step) => step.getAttribute('status'))).to.deep.equal(
          status === 'complete'
            ? ['complete', 'complete', 'complete', 'complete']
            : ['complete', 'complete', status],
        );
        expect(steps.at(-1).querySelector('[slot="description"]').textContent.trim().replace(/\s+/g, ' '))
          .to.equal(descriptions[status]);
        for (const step of steps) {
          await step.updateComplete;
          const line = step.shadowRoot.querySelector('.swc-ResponseStatusStep-line');
          expect(line.getBoundingClientRect().height > 0, `${status}: ${step.labelText}`)
            .to.equal(step !== steps.at(-1));
        }
      }

      responseStatus.setAttribute('status', 'unsupported');
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(label.textContent).to.equal('You stopped the response');
    } finally {
      mount.remove();
      sandbox.restore();
    }
  });
});

describe('prop-listener — listenForPropUpdates', () => {
  it('invokes the handler with the unwrapped property/attribute/value', () => {
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    send({ type: 'prop-update', property: 'variant', attribute: 'variant', value: 'accent' });
    expect(calls).to.have.length(1);
    expect(calls[0]).to.deep.equal({ property: 'variant', attribute: 'variant', value: 'accent' });
  });

  it('ignores messages of other types (e.g. theme-update)', () => {
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    send({ type: 'theme-update', scheme: 'dark' });
    send({ notAType: true });
    expect(calls).to.have.length(0);
  });

  it('tolerates messages with no data (cross-frame noise)', () => {
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    expect(() => send(undefined)).to.not.throw();
    expect(calls).to.have.length(0);
  });

  it('ignores prop updates from another same-origin frame or a missing sender', () => {
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    const otherFrame = document.createElement('iframe');
    document.body.append(otherFrame);
    try {
      for (const source of [otherFrame.contentWindow, null]) {
        send({ type: 'prop-update', attribute: 'onclick', value: 'alert(1)' }, { source });
      }
      expect(calls).to.have.length(0);
    } finally {
      otherFrame.remove();
    }
  });

  it('ignores prop updates from a parent with a different or opaque origin', () => {
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    const differentPort = new URL(window.location.origin);
    differentPort.port = differentPort.port === '2001' ? '2002' : '2001';
    const differentScheme = new URL(window.location.origin);
    differentScheme.protocol = differentScheme.protocol === 'http:' ? 'https:' : 'http:';

    for (const origin of [
      'https://untrusted.example', differentPort.origin, differentScheme.origin, 'null', '',
    ]) {
      send({ type: 'prop-update', attribute: 'onclick', value: 'alert(1)' }, { origin });
    }
    expect(calls).to.have.length(0);
  });

  it('passes falsy values through instead of dropping them', () => {
    // The block sends `false` to clear a boolean attribute and `''` to clear
    // text — the shell needs those, so they must not be swallowed.
    const calls = [];
    listenForPropUpdates((p) => calls.push(p));
    send({ type: 'prop-update', attribute: 'disabled', value: false });
    send({ type: 'prop-update', property: 'label', value: '' });
    expect(calls).to.have.length(2);
    expect(calls[0]).to.deep.equal({ property: undefined, attribute: 'disabled', value: false });
    expect(calls[1]).to.deep.equal({ property: 'label', attribute: undefined, value: '' });
  });
});

describe('notifyPreviewReady', () => {
  it('posts a preview-ready message to the parent frame', () => {
    const postMessageSpy = sinon.stub(window.parent, 'postMessage');
    try {
      notifyPreviewReady();
      expect(postMessageSpy.calledWith({ type: 'preview-ready' }, '*')).to.be.true;
    } finally {
      postMessageSpy.restore();
    }
  });
});

// window.parent === window in this top-level test page, so the response has
// to carry this page's origin and an explicit `source: window` — a real
// iframe's parent is a distinct window object.
describe('requestMarkup', () => {
  it('posts a markup-request only to a same-origin parent frame', () => {
    const postMessageSpy = sinon.stub(window.parent, 'postMessage');
    try {
      requestMarkup();
      expect(postMessageSpy.calledWith({ type: 'markup-request' }, window.location.origin)).to.be.true;
    } finally {
      postMessageSpy.restore();
    }
  });

  it('resolves with the markup from a matching markup-response', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: '<swc-button>Label</swc-button>' },
      source: window,
      origin: window.location.origin,
    }));
    expect(await promise).to.equal('<swc-button>Label</swc-button>');
  });

  it('resolves with an empty string when the parent has no markup', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: null },
      source: window,
      origin: window.location.origin,
    }));
    expect(await promise).to.equal('');
  });

  it('ignores a markup-response from an unrelated frame', async () => {
    const otherFrame = document.createElement('iframe');
    document.body.append(otherFrame);
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: 'wrong-frame' },
      source: otherFrame.contentWindow,
      origin: window.location.origin,
    }));
    otherFrame.remove();
    // The real response, from the true parent, still resolves the promise.
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: 'real-markup' },
      source: window,
      origin: window.location.origin,
    }));
    expect(await promise).to.equal('real-markup');
  });

  it('ignores messages of other types (e.g. prop-update)', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'prop-update', property: 'variant', value: 'accent' },
      source: window,
      origin: window.location.origin,
    }));
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: 'the-real-one' },
      source: window,
      origin: window.location.origin,
    }));
    expect(await promise).to.equal('the-real-one');
  });

  it('rejects markup from a parent with a different or opaque origin', async () => {
    const differentPort = new URL(window.location.origin);
    differentPort.port = differentPort.port === '2001' ? '2002' : '2001';

    for (const origin of ['https://untrusted.example', differentPort.origin, 'null', '']) {
      const promise = requestMarkup();
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'markup-response', markup: 'untrusted-markup' },
        source: window,
        origin,
      }));
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'markup-response', markup: 'trusted-markup' },
        source: window,
        origin: window.location.origin,
      }));
      expect(await promise).to.equal('trusted-markup');
    }
  });
});
