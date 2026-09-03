// The "unset" choice for a property that can be absent entirely. It leads the option
// list, so it lands as the control's default, and every apply and serialize path omits
// the property rather than reflecting the sentinel.
//
// The values are deliberately opaque, and must stay that way: a readable sentinel
// collides with real catalog values. `DEFAULT_OPTION` used to be the literal string
// "default", which 7 RSP props ship as a genuine enum member — ColorSwatchPicker's
// `rounding` among them, where "default" is a real value and `none` is the default, so
// selecting it dropped the prop and rendered the wrong one. Display comes from
// optionLabel(); only that is ever shown to a reader.
//
//   NONE_OPTION     an optional attribute that is simply off — Badge's `fixed?`,
//                   Button's `staticColor?`.
//   DEFAULT_OPTION  a property the component derives when it is absent — ColorArea
//                   reads xChannel/yChannel from its value's color space.
export const NONE_OPTION = '__unset_none__';
export const DEFAULT_OPTION = '__unset_default__';

// The label each sentinel renders as — the implementation's own word for an absent
// value, so a reader recognises the choice.
const UNSET_LABELS = new Map([
  [NONE_OPTION, 'None'],
  [DEFAULT_OPTION, 'default'],
]);

export function isUnsetOption(value) {
  return UNSET_LABELS.has(value);
}

// A real option renders as itself; a sentinel renders as its label.
export function optionLabel(value) {
  return UNSET_LABELS.get(value) ?? value;
}
