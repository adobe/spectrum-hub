import { iconHref } from '../../shared/playground/build-icon-svg.js';
import { NO_ICON } from '../../shared/playground/icon-options.js';

// A leaf RSP component only has one `children` prop to render both an icon
// and text through, so the two are tracked separately (see initRsp() in
// index.html) and combined here into whatever `children` should actually be.
export function composeChildren(iconChild, textChild) {
  if (iconChild && textChild != null) { return [iconChild, textChild]; }
  return iconChild ?? textChild;
}

// Builds the icon child element for the "icon" prop-update, or null for
// NO_ICON. `createElement` is injected (React's, in practice) so this can be
// exercised with a fake in tests, same as build-composite-element.js.
export function buildIconChild(createElement, value) {
  if (value === NO_ICON) { return null; }
  // Explicit size + `currentColor` fill: unlike SWC's slotted <svg> (sized by
  // the component), a bare RSP <svg> has no wrapper and renders 0×0 in black
  // without them. Confirmed live.
  return createElement('svg', {
    key: 'icon', viewBox: '0 0 20 20', width: 20, height: 20, fill: 'currentColor',
  }, createElement('use', { href: iconHref(value) }));
}
