import { TEXT_KEYS } from '../../shared/playground/text-keys.js';

// @react-spectrum/s2 only renders text via "children", unless the component
// documents a real "label" prop of its own (e.g. Meter, AvatarGroup).
export function resolveRspPropKey(property, hasRealLabelProp = false) {
  if (property === 'label' && hasRealLabelProp) {
    return 'label';
  }
  return TEXT_KEYS.has(property) ? 'children' : property;
}

export function hasLabelProp(props) {
  return Array.isArray(props) && props.some((p) => p.property === 'label');
}

/**
 * The attribute name the RSP shell mirrors a prop onto #mount under, so the preview
 * shell's CSS has the same hook SWC gets for free.
 *
 * SWC reflects each prop onto the live element under the attribute its catalog row
 * names; an RSP row has no `attribute` at all, because RSP props are not attributes
 * (see docs/PLAYGROUND-CONTRACT.md). The name is therefore derived here rather than
 * read from the catalog — deriving it is the whole point, not a shortcut.
 *
 * Returns null for an empty property, which applyAttribute treats as "nothing to do".
 */
export function mountAttributeName(property) {
  if (!property) { return null; }
  return property
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
