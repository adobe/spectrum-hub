<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     CloseButton has no `children` prop either — like ClearButton it always
     renders its own internal cross icon. Unlike ClearButton, its own
     implementation (src/CloseButton.tsx) already falls back to a localized
     "Dismiss" `aria-label` when none is provided, so an explicit one isn't
     strictly required for accessibility here — but `aria-label` still isn't
     in CloseButton's own extracted prop data, and authoring one explicitly
     makes the code disclosure panel show real intent instead of an implicit
     fallback string. Also fixes the label: the hyphenated component name
     would otherwise fall back to "Close-button". -->
<CloseButton aria-label="Close" />
