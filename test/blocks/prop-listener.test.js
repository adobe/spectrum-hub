import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { listenForPropUpdates, notifyPreviewReady, requestMarkup } from '../../deps/shared/playground/prop-listener.js';

// listenForPropUpdates wires a window 'message' listener; message events are
// delivered synchronously via dispatchEvent, so no awaiting is needed.
function send(data) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

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
    expect(() => window.dispatchEvent(new MessageEvent('message'))).to.not.throw();
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
// to be dispatched with an explicit `source: window` to pass requestMarkup's
// own-parent check — a real iframe's parent is a distinct window object.
describe('requestMarkup', () => {
  it('posts a markup-request to the parent frame', () => {
    const postMessageSpy = sinon.stub(window.parent, 'postMessage');
    try {
      requestMarkup();
      expect(postMessageSpy.calledWith({ type: 'markup-request' }, '*')).to.be.true;
    } finally {
      postMessageSpy.restore();
    }
  });

  it('resolves with the markup from a matching markup-response', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: '<swc-button>Label</swc-button>' },
      source: window,
    }));
    expect(await promise).to.equal('<swc-button>Label</swc-button>');
  });

  it('resolves with an empty string when the parent has no markup', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: null },
      source: window,
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
    }));
    otherFrame.remove();
    // The real response, from the true parent, still resolves the promise.
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: 'real-markup' },
      source: window,
    }));
    expect(await promise).to.equal('real-markup');
  });

  it('ignores messages of other types (e.g. prop-update)', async () => {
    const promise = requestMarkup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'prop-update', property: 'variant', value: 'accent' },
      source: window,
    }));
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'markup-response', markup: 'the-real-one' },
      source: window,
    }));
    expect(await promise).to.equal('the-real-one');
  });
});
