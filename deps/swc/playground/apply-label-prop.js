import { applyAttribute } from '../../shared/playground/apply-attribute.js';

// Returns false when neither a real attribute nor a label slot exists, so the
// caller can fall back to the flat text/children convention.
export function applyLabelProp(el, attribute, value) {
  if (attribute) {
    applyAttribute(el, attribute, value);
    return true;
  }

  const labelTarget = el.querySelector('[slot="label"]');
  if (labelTarget) {
    labelTarget.textContent = value;
    return true;
  }

  return false;
}
