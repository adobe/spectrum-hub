<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `ClearButton`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     ClearButton has no `children` prop — it always renders its own internal cross
     icon — so `aria-label` is set here to give a standalone instance an accessible
     name, and to keep the label off the fallback "Clear-button". -->
<ClearButton aria-label="Clear text" />
