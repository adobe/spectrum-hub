<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; this reuses table-view.jsx's own two-row/three-cell shape (same
     row ids and cell text) so the two files read as the same table's body.

     TableBody's own prop data documents only an optional `renderEmptyState`
     function — not settable here since this fragment format only carries
     string XML attributes, no functions (irrelevant anyway since these rows
     aren't empty). Row>Cell is a required nesting level, not optional
     wrapping, to render anything meaningful.

     TableBody is normally used only nested inside <TableView>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM (bare rows) rather than a
     crash. -->
<TableBody>
  <Row id="budget">
    <Cell>Budget.xlsx</Cell>
    <Cell>Spreadsheet</Cell>
    <Cell>Jan 1, 2026</Cell>
  </Row>
  <Row id="roadmap">
    <Cell>Roadmap.pdf</Cell>
    <Cell>Document</Cell>
    <Cell>Jan 2, 2026</Cell>
  </Row>
</TableBody>
