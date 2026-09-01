<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `CoachMark`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     Props extend react-aria-components' PopoverProps, so it anchors to a target via
     `triggerRef` — normally supplied by a CoachMarkTrigger wrapper. `children` is
     required, so real body text is used rather than a placeholder. -->
<CoachMark>Click here to get started with your first project.</CoachMark>
