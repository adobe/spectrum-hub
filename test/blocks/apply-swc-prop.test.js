import { expect } from '@esm-bundle/chai';
import { applySwcProp } from '../../deps/swc/playground/apply-swc-prop.js';
import { NO_ICON } from '../../deps/shared/playground/icon-options.js';

// Exercises the single dispatch point deps/swc/playground/index.html wires
// every prop-update message through — see its applySwcProp import.
describe('applySwcProp', () => {
  describe('label', () => {
    it('applies a real label attribute and does not touch textContent', () => {
      const el = document.createElement('swc-progress-circle');
      applySwcProp(el, { property: 'label', attribute: 'label', value: 'Loading' });
      expect(el.getAttribute('label')).to.equal('Loading');
      expect(el.textContent).to.equal('');
    });

    it('fills a nested [slot="label"] element when there is no real attribute', () => {
      const el = document.createElement('swc-meter');
      const span = document.createElement('span');
      span.slot = 'label';
      el.append(span);
      applySwcProp(el, { property: 'label', attribute: null, value: 'Storage used' });
      expect(span.textContent).to.equal('Storage used');
    });

    it('falls back to flat textContent when neither a real attribute nor a label slot exists', () => {
      const el = document.createElement('swc-button');
      applySwcProp(el, { property: 'label', attribute: null, value: 'Save' });
      expect(el.textContent).to.equal('Save');
    });
  });

  describe('text / children', () => {
    it('sets textContent for a "text" property', () => {
      const el = document.createElement('swc-button');
      applySwcProp(el, { property: 'text', attribute: null, value: 'Click me' });
      expect(el.textContent).to.equal('Click me');
    });

    it('sets textContent for a "children" property', () => {
      const el = document.createElement('swc-badge');
      applySwcProp(el, { property: 'children', attribute: null, value: 'New' });
      expect(el.textContent).to.equal('New');
    });
  });

  describe('icon', () => {
    it('replaces swc-icon\'s own content directly, with no slot indirection', () => {
      const el = document.createElement('swc-icon');
      applySwcProp(el, { property: 'icon', attribute: null, value: 'search' });
      const use = el.querySelector('use');
      expect(use).to.exist;
      expect(use.getAttribute('href')).to.include('search');
    });

    it('clears swc-icon\'s content for "No icon"', () => {
      const el = document.createElement('swc-icon');
      el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
      applySwcProp(el, { property: 'icon', attribute: null, value: NO_ICON });
      expect(el.children.length).to.equal(0);
    });

    it('prepends a new slotted svg when none exists yet', () => {
      const el = document.createElement('swc-action-button');
      applySwcProp(el, { property: 'icon', attribute: null, value: 'edit' });
      const svg = el.querySelector('[slot="icon"]');
      expect(svg).to.exist;
      expect(svg.tagName.toLowerCase()).to.equal('svg');
      expect(el.firstElementChild).to.equal(svg);
    });

    it('fills an existing slotted svg in place rather than replacing the element', () => {
      const el = document.createElement('swc-action-button');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('slot', 'icon');
      svg.setAttribute('viewBox', '0 0 20 20');
      el.append(svg);
      applySwcProp(el, { property: 'icon', attribute: null, value: 'delete' });
      expect(el.querySelector('[slot="icon"]')).to.equal(svg);
      expect(svg.querySelector('use').getAttribute('href')).to.include('delete');
    });

    it('recreates the slotted svg (with a viewBox) after a prior "No icon" removed it', () => {
      const el = document.createElement('swc-action-button');
      applySwcProp(el, { property: 'icon', attribute: null, value: NO_ICON });
      expect(el.querySelector('[slot="icon"]')).to.not.exist;
      applySwcProp(el, { property: 'icon', attribute: null, value: 'revert' });
      const svg = el.querySelector('[slot="icon"]');
      expect(svg).to.exist;
      expect(svg.getAttribute('viewBox')).to.equal('0 0 20 20');
    });

    it('removes the slotted svg entirely for "No icon" rather than leaving it empty', () => {
      const el = document.createElement('swc-action-button');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('slot', 'icon');
      el.append(svg);
      applySwcProp(el, { property: 'icon', attribute: null, value: NO_ICON });
      expect(el.querySelector('[slot="icon"]')).to.not.exist;
    });
  });

  describe('other attributes', () => {
    it('falls back to reflecting a plain attribute', () => {
      const el = document.createElement('swc-button');
      applySwcProp(el, { property: 'variant', attribute: 'variant', value: 'primary' });
      expect(el.getAttribute('variant')).to.equal('primary');
    });

    it('removes the attribute for a false value, same as applyAttribute', () => {
      const el = document.createElement('swc-button');
      el.setAttribute('quiet', '');
      applySwcProp(el, { property: 'isQuiet', attribute: 'quiet', value: false });
      expect(el.hasAttribute('quiet')).to.be.false;
    });
  });
});
