<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `PopoverBase`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     Popover's unstyled/standalone-oriented sibling. PopoverBase.json documents
     `triggerRef` as "only required when used standalone"; `children` isn't extracted
     at all, so a plain text child is used, the same minimal shape as popover.jsx. -->
<PopoverBase>Popover content goes here.</PopoverBase>
