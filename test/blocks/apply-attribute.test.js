import { expect } from '@esm-bundle/chai';
import { applyAttribute } from '../../deps/shared/playground/apply-attribute.js';

// Shared by both preview shells (deps/swc/playground/index.html and
// deps/rsp/playground/index.html):
// - SWC's applySwcProp reflects an update onto the live custom element.
// - RSP's preview reflects the same update onto the #mount container, since
//   @react-spectrum/s2 doesn't expose most props back as real DOM attributes,
//   and CSS like the static-color contrasting-backdrop rule needs one to exist
//   somewhere in body's subtree.
describe('applyAttribute', () => {
  it('sets the attribute to the given string value', () => {
    const el = document.createElement('div');
    applyAttribute(el, 'static-color', 'black');
    expect(el.getAttribute('static-color')).to.equal('black');
  });

  it('sets a bare (valueless) attribute for a true boolean value', () => {
    const el = document.createElement('div');
    applyAttribute(el, 'disabled', true);
    expect(el.getAttribute('disabled')).to.equal('');
  });

  it('removes the attribute for a false value', () => {
    const el = document.createElement('div');
    el.setAttribute('disabled', '');
    applyAttribute(el, 'disabled', false);
    expect(el.hasAttribute('disabled')).to.be.false;
  });

  it('removes the attribute for a null or undefined value', () => {
    const el = document.createElement('div');
    el.setAttribute('static-color', 'white');
    applyAttribute(el, 'static-color', null);
    expect(el.hasAttribute('static-color')).to.be.false;
    el.setAttribute('static-color', 'white');
    applyAttribute(el, 'static-color', undefined);
    expect(el.hasAttribute('static-color')).to.be.false;
  });

  it('updates an already-set attribute to a new value', () => {
    const el = document.createElement('div');
    el.setAttribute('static-color', 'black');
    applyAttribute(el, 'static-color', 'white');
    expect(el.getAttribute('static-color')).to.equal('white');
  });

  it('does nothing when attribute is falsy (no attribute to reflect onto)', () => {
    const el = document.createElement('div');
    expect(() => applyAttribute(el, null, 'black')).to.not.throw();
    expect(el.attributes.length).to.equal(0);
  });
});
