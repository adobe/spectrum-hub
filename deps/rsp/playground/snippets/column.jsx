<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; text reuses table-view.jsx's first column label.

     A leaf-with-text fragment: Column's own prop data marks `children`
     required (ReactNode, "the content to render as the column header"). No
     nested content beyond that text is meaningful for a standalone Column,
     unlike TableHeader/TableBody which need real Column/Row/Cell nesting.

     Column is normally used only nested inside <TableHeader>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM rather than a crash. -->
<Column>Name</Column>
