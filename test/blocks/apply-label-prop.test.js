import { expect } from '@esm-bundle/chai';
import { applyLabelProp } from '../../deps/swc/playground/apply-label-prop.js';

// Mirrors the two real shapes a "label"-authored property can take on an SWC
// custom element: a real reflected attribute (e.g. swc-progress-circle's
// `label`) or a nested `slot="label"` element (e.g. swc-meter's/
// swc-accordion-item's visible label) — see deps/swc/playground/index.html's
// applySwcProp for how this return value is used to decide whether to fall
// back to the flat text/children convention instead.
describe('applyLabelProp', () => {
  it('sets a real attribute when one is given, and reports it applied', () => {
    const el = document.createElement('div');
    const applied = applyLabelProp(el, 'label', 'Loading');
    expect(el.getAttribute('label')).to.equal('Loading');
    expect(applied).to.be.true;
  });

  it('removes a real attribute for a falsy value, and still reports it applied', () => {
    const el = document.createElement('div');
    el.setAttribute('label', 'Loading');
    const applied = applyLabelProp(el, 'label', null);
    expect(el.hasAttribute('label')).to.be.false;
    expect(applied).to.be.true;
  });

  it('sets a nested [slot="label"] element\'s text when no real attribute is given', () => {
    const el = document.createElement('div');
    const span = document.createElement('span');
    span.slot = 'label';
    span.textContent = 'Storage used';
    el.append(span);

    const applied = applyLabelProp(el, null, 'Disk space');
    expect(span.textContent).to.equal('Disk space');
    expect(applied).to.be.true;
  });

  it('does not touch the root element\'s own text when applying via a label slot', () => {
    const el = document.createElement('div');
    const span = document.createElement('span');
    span.slot = 'label';
    el.append(span, document.createTextNode('unrelated content'));

    applyLabelProp(el, null, 'New label');
    expect(el.textContent).to.include('unrelated content');
  });

  it('returns false when there is no real attribute and no label slot', () => {
    const el = document.createElement('div');
    const applied = applyLabelProp(el, null, 'New label');
    expect(applied).to.be.false;
    expect(el.textContent).to.equal('');
  });

  it('prefers a real attribute over a label slot when both are somehow present', () => {
    const el = document.createElement('div');
    const span = document.createElement('span');
    span.slot = 'label';
    span.textContent = 'Original';
    el.append(span);

    applyLabelProp(el, 'label', 'Via attribute');
    expect(el.getAttribute('label')).to.equal('Via attribute');
    expect(span.textContent).to.equal('Original');
  });
});
