<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-item default.

     aria-label is required here: like Tabs, react-aria's underlying
     SegmentedControl throws an accessible-name error at render time without
     an aria-label or aria-labelledby. Each SegmentedControlItem's `id` is
     required — it's what SegmentedControl's `selectedKey` matches against. -->
<SegmentedControl aria-label="View">
  <SegmentedControlItem id="list">List</SegmentedControlItem>
  <SegmentedControlItem id="grid">Grid</SegmentedControlItem>
</SegmentedControl>
