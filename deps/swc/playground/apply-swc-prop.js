import { applyAttribute } from '../../shared/playground/apply-attribute.js';
import { applyLabelProp } from './apply-label-prop.js';
import { buildIconSvg, buildIconUse } from '../../shared/playground/build-icon-svg.js';
import { NO_ICON } from '../../shared/playground/icon-options.js';
import { isUnsetOption } from '../../shared/playground/unset-control-options.js';

// Applies one prop-update message to a live SWC element.
export function applySwcProp(el, { property, attribute, value }) {
  // See apply-label-prop.js for why a real attribute or slot beats textContent.
  if (property === 'label' && applyLabelProp(el, attribute, value)) {
    return;
  }

  if (property === 'text' || property === 'label' || property === 'children') {
    el.textContent = value;
    return;
  }

  if (property === 'icon') {
    // swc-icon is itself the icon — no slot element.
    if (el.localName === 'swc-icon') {
      if (value === NO_ICON) {
        el.replaceChildren();
      } else {
        el.replaceChildren(buildIconSvg(value));
      }
      return;
    }
    // Remove, not clear: an empty slotted element still reserves its box and gap.
    if (value === NO_ICON) {
      el.querySelector('[slot="icon"]')?.remove();
      return;
    }
    // Fill the existing svg in place, recreating it if "No icon" removed it.
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

  // The "unset" choice for an optional attribute — remove it rather than reflect
  // the sentinel string.
  if (isUnsetOption(value)) {
    applyAttribute(el, attribute, null);
    return;
  }

  applyAttribute(el, attribute, value);
}
