// Route -> which Trigger wraps it + the trigger Button's label. These
// components render nothing standalone without one.
// An entry with no `trigger` (toast-container) has no wrapping Trigger
// component of its own — the queue fires imperatively (ToastQueue.info(...)),
// so its Button sits as a sibling instead of a parent (see initRsp() in
// index.html and buildRspSnippet() in ../../../blocks/playground/playground.js).
// No timeout is passed, so the toast stays open until dismissed.
export const OVERLAY_TRIGGERS = {
  dialog: { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'alert-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'custom-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'fullscreen-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  popover: { trigger: 'DialogTrigger', triggerLabel: 'Open popover' },
  tooltip: { trigger: 'TooltipTrigger', triggerLabel: 'Hover me' },
  'toast-container': { triggerLabel: 'Show Toast', queueExport: 'ToastQueue', toastMessage: 'Toasting…' },
};

/**
 * The overlay shape a route needs, derived from its OVERLAY_TRIGGERS entry — shared by the
 * live preview (index.html) and the snippet builder (../../../blocks/playground/
 * playground.js) so the two render targets read the same decision instead of each
 * re-deriving it from `trigger`'s presence independently:
 *  - 'wrap': a real Trigger component wraps both the Button and the route's own element.
 *  - 'sibling': no Trigger of its own — the Button fires an imperative queue call and sits
 *    next to the element instead of wrapping it (toast-container).
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
