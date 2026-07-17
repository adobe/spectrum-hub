import { applyAttribute } from '../../shared/playground/apply-attribute.js';
import { applyLabelProp } from './apply-label-prop.js';
import { buildIconSvg, buildIconUse } from '../../shared/playground/build-icon-svg.js';
import { NO_ICON } from '../../shared/playground/icon-options.js';

// Applies one prop-update message from the block to a live SWC custom element.
export function applySwcProp(el, { property, attribute, value }) {
  // "label" prefers a real attribute or a `slot="label"` element over
  // flat textContent — see apply-label-prop.js.
  if (property === 'label' && applyLabelProp(el, attribute, value)) {
    return;
  }

  if (property === 'text' || property === 'label' || property === 'children') {
    el.textContent = value;
    return;
  }

  if (property === 'icon') {
    // swc-icon IS the icon (no separate slot element to reserve space).
    if (el.localName === 'swc-icon') {
      if (value === NO_ICON) {
        el.replaceChildren();
      } else {
        el.replaceChildren(buildIconSvg(value));
      }
      return;
    }
    // Remove (not just clear) the slot element for "No icon" — an empty
    // slotted element still reserves the icon's box and gap.
    if (value === NO_ICON) {
      el.querySelector('[slot="icon"]')?.remove();
      return;
    }
    // Fill the existing `<svg slot="icon">` in place, recreating it if a
    // prior "No icon" removed it.
    const existing = el.querySelector('[slot="icon"]');
    if (existing) {
      if (!existing.hasAttribute('viewBox')) { existing.setAttribute('viewBox', '0 0 20 20'); }
      existing.replaceChildren(buildIconUse(value));
    } else {
      const svg = buildIconSvg(value);
      svg.setAttribute('slot', 'icon');
      el.prepend(svg);
    }
    return;
  }

  applyAttribute(el, attribute, value);
}
