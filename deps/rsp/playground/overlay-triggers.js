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
