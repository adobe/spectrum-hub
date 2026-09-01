<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `Icon`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     There is no generic `Icon` component to export: src/Icon.tsx ships only the
     `createIcon`/`createIllustration` factories and their contexts. Real usage is one
     of the individual pre-built glyph components those factories produce. -->
<Icon aria-label="Icon" />
