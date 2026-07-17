// @react-spectrum/s2 only renders text via "children", unless the component
// documents a real "label" prop of its own (e.g. Meter, AvatarGroup).
const TEXT_KEYS = new Set(['text', 'label', 'children']);

export function resolveRspPropKey(property, hasRealLabelProp = false) {
  if (property === 'label' && hasRealLabelProp) {
    return 'label';
  }
  return TEXT_KEYS.has(property) ? 'children' : property;
}

export function hasLabelProp(props) {
  return Array.isArray(props) && props.some((p) => p.property === 'label');
}
