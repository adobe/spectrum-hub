<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name — "Action-
     button" — instead of a real label. Mirrors deps/swc/playground/snippets/action-button.html. -->
<ActionButton>Action Button</ActionButton>
