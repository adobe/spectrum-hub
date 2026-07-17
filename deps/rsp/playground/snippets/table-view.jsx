<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-row default.

     aria-label is required here: like Tabs, react-aria's underlying
     TableView throws an accessible-name error at render time without an
     aria-label or aria-labelledby. This is the deepest composite in the set —
     TableHeader>Column and TableBody>Row>Cell are both required nesting
     levels, not optional wrapping; `isRowHeader` on the first Column is
     required for at least one column to identify each row accessibly.
     Written as `isRowHeader=""` rather than the bare-attribute JSX shorthand
     — this fragment is parsed as strict XML (see fetchCompositeRoot in
     deps/rsp/playground/index.html), which has no concept of a valueless attribute;
     an empty string round-trips to `true` the same way (see
     buildCompositeElement/buildRspSnippet's `value === '' ? true : value`). -->
<TableView aria-label="Files">
  <TableHeader>
    <Column isRowHeader="">Name</Column>
    <Column>Type</Column>
    <Column>Date modified</Column>
  </TableHeader>
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
</TableView>
