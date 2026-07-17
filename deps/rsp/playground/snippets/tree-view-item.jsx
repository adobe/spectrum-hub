<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; the id/textValue/content mirror one item from tree-view.jsx's
     existing two-branch default rather than inventing new content.

     TreeViewItem's own prop data marks both `textValue` and `children`
     required; TreeViewItemContent wraps the row's own label, distinct from
     any nested child TreeViewItems (not included here — a single flat item
     is enough to demonstrate this component standalone).

     TreeViewItem is normally used only nested inside <TreeView>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled/uninteractive DOM (a bare row)
     rather than a crash. -->
<TreeViewItem id="assets" textValue="Assets">
  <TreeViewItemContent>Assets</TreeViewItemContent>
</TreeViewItem>
