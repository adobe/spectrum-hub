<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     `id` is required per SegmentedControlItem.json — it's what a parent
     SegmentedControl's `selectedKey` matches against (see
     segmented-control.jsx) — so it's authored here too even though nothing
     reads it standalone.

     STANDALONE CAVEAT: SegmentedControlItem is a collection sub-item —
     normally only used nested inside SegmentedControl, which supplies the
     actual radio-group-like selection chrome. Loaded directly via
     ?component=segmented-control-item&implementation=rsp with no
     SegmentedControl wrapper, it's expected to degrade gracefully the same
     way AccordionItem does standalone (verified live for AccordionItem, not
     independently re-verified for SegmentedControlItem itself): real DOM
     renders as a plain, under-chromed element rather than crashing.
     Flagging for a live double-check. -->
<SegmentedControlItem id="list">List</SegmentedControlItem>
