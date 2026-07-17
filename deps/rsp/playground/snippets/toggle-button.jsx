<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name —
     "Toggle-button" — instead of a real label. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     Unlike the collection sub-items in this batch (Tag, Breadcrumb, etc.),
     ToggleButton behaves like ActionButton/Button (see action-button.jsx) —
     it's expected to be fine fully standalone, with or without a
     ToggleButtonGroup parent (see toggle-button-group.jsx). -->
<ToggleButton>Toggle Button</ToggleButton>
