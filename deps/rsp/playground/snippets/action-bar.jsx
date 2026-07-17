<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     `selectedItemCount` is required for the ActionBar to actually show
     itself (ActionBar.json: "If 0, the ActionBar is hidden") — set to the
     `'all'` string-literal option here rather than a numeric string, since
     buildCompositeElement (build-composite-element.js) and initRsp() never
     cast fragment attribute values, they pass every one through as a literal
     string; `'all'` is a real member of ActionBar's `number | 'all'` union,
     so it round-trips correctly without needing a number.

     GENUINELY UNSURE: ActionBar is normally shown by a CardView/TableView's
     `renderActionBar` callback in response to real collection selection —
     standalone here it has no such collection driving it, only the
     `selectedItemCount` prop asserting a count exists. Expected to render
     its ActionButtons and clear affordance since nothing in its own props
     requires a live selection-state object, but this isn't independently
     live-verified — flagging for a live double-check. -->
<ActionBar selectedItemCount="all">
  <ActionButton>Edit</ActionButton>
  <ActionButton>Delete</ActionButton>
</ActionBar>
