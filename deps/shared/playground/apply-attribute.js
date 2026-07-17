// Shared by both preview shells: SWC reflects onto the live element, RSP onto
// #mount (since @react-spectrum/s2 doesn't expose most props as DOM attributes).
export function applyAttribute(el, attribute, value) {
  if (!attribute) { return; }

  if (value === false || value === null || value === undefined) {
    el.removeAttribute(attribute);
  } else if (value === true) {
    el.setAttribute(attribute, '');
  } else {
    el.setAttribute(attribute, value);
  }
}
