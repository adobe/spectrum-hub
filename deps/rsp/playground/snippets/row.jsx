<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; text reuses table-view.jsx's first row's first cell value.

     A leaf-with-text fragment: Row's own prop data doesn't mark `children`
     required (unlike Column/Cell), but a real Row's children are normally
     Cell elements, not bare text — this fragment keeps it to plain text
     anyway, on the assumption it degrades the same way other collection
     sub-items in this batch do rather than needing real Cell nesting to
     avoid crashing (TableBody already demonstrates the real Row>Cell shape).

     Row is normally used only nested inside <TableBody>/<TableFooter>.
     Loaded standalone, assume the same graceful-degradation behavior
     verified live for AccordionItem: some real, unstyled DOM (a bare row)
     rather than a crash. -->
<Row>Budget.xlsx</Row>
