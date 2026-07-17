<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; the columns line up with table-header.jsx/table-view.jsx's
     Name/Type/Date-modified shape, filled in as a summary row.

     TableFooter.json documents an empty `props` array — no properties
     extracted at all, not even `children` — which looks like a gap in the
     extraction rather than a component that truly takes nothing, since a
     footer with no content wouldn't render anything. Modeled here with the
     same Row>Cell nesting TableBody requires, on the assumption it behaves
     the same way structurally.

     TableFooter is normally used only nested inside <TableView>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM (a bare row) rather than a
     crash — though given the empty prop data, this one is the least certain
     of the batch and worth double-checking live. -->
<TableFooter>
  <Row id="totals">
    <Cell>Total</Cell>
    <Cell>2 files</Cell>
    <Cell>—</Cell>
  </Row>
</TableFooter>
