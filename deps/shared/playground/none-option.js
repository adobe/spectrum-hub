// The "unset" choice for a property that can be absent entirely. It leads the option
// list, so it lands as the control's default, and every apply path omits the property
// rather than reflecting the sentinel string as a real value.
//
// Two labels, one meaning. The label is what the implementation's own docs call an
// absent value, so a reader recognises the choice:
//
//   NONE_OPTION     an optional attribute that is simply off — Badge's `fixed?`,
//                   Button's `staticColor?`.
//   DEFAULT_OPTION  a property the component derives when it is absent — ColorArea
//                   reads xChannel/yChannel from its value's color space, which is
//                   what the S2 docs present as the default.
//
// Compare with isUnsetOption(), never against one constant: a path that checked only
// NONE_OPTION would reflect "default" as a literal channel name.
export const NONE_OPTION = 'None';
export const DEFAULT_OPTION = 'default';

const UNSET_OPTIONS = new Set([NONE_OPTION, DEFAULT_OPTION]);

export function isUnsetOption(value) {
  return UNSET_OPTIONS.has(value);
}
