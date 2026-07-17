<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     A leaf component: its own prop data marks `children` required (ReactNode).

     TreeViewItemContent is normally used only nested inside TreeViewItem.
     Loaded standalone, assume the same graceful-degradation behavior verified
     live for AccordionItem: some real, unstyled DOM rather than a crash. -->
<TreeViewItemContent>Item content</TreeViewItemContent>
