import { iconHref } from '../../shared/playground/build-icon-svg.js';
import { NO_ICON } from '../../shared/playground/icon-options.js';

// A leaf RSP component has only one `children` prop for both icon and text,
// so the two are tracked separately (see initRsp()) and combined here.
export function composeChildren(iconChild, textChild) {
  if (iconChild && textChild != null) { return [iconChild, textChild]; }
  return iconChild ?? textChild;
}

// `createElement` is injected (React's, in practice) so this is testable with a fake.
export function buildIconChild(createElement, value) {
  if (value === NO_ICON) { return null; }
  // Explicit size/fill: a bare RSP <svg> has no sizing wrapper and renders 0×0 in black.
  // alignSelf: Button's flex row uses align-items: baseline (for real RSP icons'
  // centerBaseline() wrapper); without this a bare <svg> baseline-aligns to the
  // bottom of the label instead of its visual center.
  return createElement('svg', {
    key: 'icon',
    viewBox: '0 0 20 20',
    width: 20,
    height: 20,
    fill: 'currentColor',
    style: { alignSelf: 'center' },
  }, createElement('use', { href: iconHref(value) }));
}
