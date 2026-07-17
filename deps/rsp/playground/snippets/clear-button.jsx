<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     ClearButton has no `children` prop at all — its implementation
     (src/ClearButton.tsx) always renders its own internal cross icon and
     ignores any children passed to it, so unlike Avatar there's no
     "silently blank" risk, just an icon-only button with no accessible name
     by default. `aria-label` isn't in ClearButton's own extracted prop data
     (in real usage it's normally supplied implicitly by a parent like
     SearchField/TagGroup that already has a labeled context), so this
     fragment adds one directly for a standalone preview. Also fixes the
     label: the hyphenated component name would otherwise fall back to
     "Clear-button". -->
<ClearButton aria-label="Clear text" />
