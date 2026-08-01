// Route -> which Trigger wraps it + the trigger Button's label. These
// components render nothing standalone without one.
export const OVERLAY_TRIGGERS = {
  dialog: { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'alert-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'custom-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'fullscreen-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  popover: { trigger: 'DialogTrigger', triggerLabel: 'Open popover' },
  tooltip: { trigger: 'TooltipTrigger', triggerLabel: 'Hover me' },
};
