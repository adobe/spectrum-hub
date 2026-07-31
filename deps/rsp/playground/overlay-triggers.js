// Real @react-spectrum/s2 usage always nests these behind a Trigger that
// supplies open/anchor state via context — confirmed live (see each
// affected snippet's own dev comment) to mount nothing at all when rendered
// standalone the way every other playground route renders its component.
// Maps the block's kebab-case route name to which Trigger wraps it and what
// the trigger control's own label should read.
export const OVERLAY_TRIGGERS = {
  dialog: { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'alert-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'custom-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  'fullscreen-dialog': { trigger: 'DialogTrigger', triggerLabel: 'Open dialog' },
  popover: { trigger: 'DialogTrigger', triggerLabel: 'Open popover' },
  tooltip: { trigger: 'TooltipTrigger', triggerLabel: 'Hover me' },
};
