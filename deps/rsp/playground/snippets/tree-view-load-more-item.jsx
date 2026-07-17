<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     Unlike the rest of this batch, none of TreeViewLoadMoreItem's own props
     (`loadingState`, `children`, `isLoading`) are marked required — it's a
     row TreeView renders itself while more items are loading, so an author
     wouldn't normally hand-author one at all. `isLoading` is written as
     `isLoading=""` (empty string) per this fragment's strict-XML parsing —
     see table-view.jsx's comment on the same convention for a boolean flag
     attribute. `children` here is plain text standing in for the real
     loading-spinner content the component would otherwise render.

     TreeViewLoadMoreItem is normally used only nested inside <TreeView>.
     Loaded standalone, assume the same graceful-degradation behavior
     verified live for AccordionItem: some real, unstyled DOM rather than a
     crash. -->
<TreeViewLoadMoreItem isLoading="">Loading more…</TreeViewLoadMoreItem>
