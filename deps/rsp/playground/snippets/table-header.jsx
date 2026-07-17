<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; this reuses table-view.jsx's own header/column shape (same
     column labels) so the two files read as the same table's header.

     TableHeader's own prop data documents no required props (`columns`,
     `children`, `dependencies` are all optional), but a real table needs
     Column child(ren) to mean anything — see table-view.jsx's comment for
     why the first column carries `isRowHeader=""`: at least one column must
     be a row header for the table to identify rows accessibly. Written as
     `isRowHeader=""` (empty string) rather than the bare-attribute JSX
     shorthand, since this fragment is parsed as strict XML.

     TableHeader is normally used only nested inside <TableView>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM (a bare header row) rather
     than a crash. -->
<TableHeader>
  <Column isRowHeader="">Name</Column>
  <Column>Type</Column>
  <Column>Date modified</Column>
</TableHeader>
