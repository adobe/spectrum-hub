import { expect } from '@esm-bundle/chai';
import { listenForPropUpdates } from '../../deps/swc/playground/prop-listener.js';

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
