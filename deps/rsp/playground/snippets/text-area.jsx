<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name — "Text-
     area" — instead of a real label. No deps/swc/playground/snippets/text-area.html
     counterpart exists yet, so there's no SWC shape to mirror.

     `label` isn't in TextArea.json's own prop list — same as TextField, it's
     inherited from the shared `LabelableProps` interface in
     rsp-base-props.json (`label: ReactNode`), not walked by this repo's
     per-component extraction. -->
<TextArea label="Comments" />
