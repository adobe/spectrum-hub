import { TEXT_KEYS } from '../../shared/playground/text-keys.js';

// Route -> which Trigger wraps it + the trigger Button's label. These
// components render nothing standalone without one.
// An entry with no `trigger` (toast) has no wrapping Trigger
// component of its own — the queue fires imperatively (ToastQueue.info(...)),
// so its Button sits as a sibling instead of a parent (see initRsp() in
// index.html and buildRspSnippet() in ../../../blocks/playground/playground.js).
// No timeout is passed, so the toast stays open until dismissed.
export const OVERLAY_TRIGGERS = {
  'standard-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'alert-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'coach-mark': { trigger: 'DialogTrigger', triggerLabel: 'Open coach mark' },
  'custom-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'takeover-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  popover: { trigger: 'DialogTrigger', triggerLabel: 'Open popover' },
  // propsOnTrigger: RSP declares every controllable Tooltip prop on TooltipTrigger,
  // not on Tooltip — see propsOwner() below.
  tooltip: { trigger: 'TooltipTrigger', triggerLabel: 'Hover me', propsOnTrigger: true },
  toast: { triggerLabel: 'Show Toast', queueExport: 'ToastQueue', toastMessage: 'Toasting…' },
};

/**
 * The overlay shape a route needs, derived from its OVERLAY_TRIGGERS entry — shared by the
 * live preview (index.html) and the snippet builder (../../../blocks/playground/
 * playground.js) so the two render targets read the same decision instead of each
 * re-deriving it from `trigger`'s presence independently:
 *  - 'wrap': a real Trigger component wraps both the Button and the route's own element.
 *  - 'sibling': no Trigger of its own — the Button fires an imperative queue call and sits
 *    next to the element instead of wrapping it (toast).
 *  - 'none': the route has no overlay trigger at all.
 *
 * @param {string} routeName
 * @returns {'wrap' | 'sibling' | 'none'}
 */
export function overlayShape(routeName) {
  const overlayTrigger = OVERLAY_TRIGGERS[routeName];
  if (!overlayTrigger) { return 'none'; }
  return overlayTrigger.trigger ? 'wrap' : 'sibling';
}

/**
 * The RSP export whose catalog holds a route's controllable props, or null when that is
 * the route's own component — true for every route but `tooltip`.
 *
 * RSP splits Tooltip's API across two exports: `Tooltip` renders the bubble, while
 * `placement`, `trigger`, `delay`, `isDisabled` and the rest are declared on
 * `TooltipTrigger`. Reading the route's own catalog there yields six props, none of them
 * a control, so every authored property is rejected as undefined.
 *
 * When this is set, the props are also APPLIED to the trigger rather than the route's
 * element — in the live preview (initRsp() in index.html) and in the code disclosure
 * (buildRspSnippet() in ../../../blocks/playground/playground.js) alike. Reading the
 * right catalog without moving the apply target would show controls that do nothing.
 *
 * @param {string} routeName
 * @returns {string | null}
 */
export function propsOwner(routeName) {
  const overlayTrigger = OVERLAY_TRIGGERS[routeName];
  return overlayTrigger?.propsOnTrigger ? overlayTrigger.trigger : null;
}

/**
 * Splits a prop bag for a route whose props live on its trigger (see propsOwner) into
 * what belongs to the route's own element and what belongs to the trigger.
 *
 * Text and children are the route's CONTENT, not the trigger's configuration:
 * `children` is populated from the fragment's own text, so handing the whole bag to the
 * trigger leaves the route's element with nothing to render — a tooltip bubble with no
 * text in it. React's createElement takes children as varargs that override
 * `props.children`, so the string is dropped silently rather than erroring.
 *
 * @param {Record<string, {value: unknown}>} currentProps
 * @returns {{ own: object, trigger: object }}
 */
export function splitTriggerProps(currentProps) {
  const own = {};
  const trigger = {};
  Object.entries(currentProps).forEach(([prop, entry]) => {
    if (TEXT_KEYS.has(prop)) { own[prop] = entry; } else { trigger[prop] = entry; }
  });
  return { own, trigger };
}
