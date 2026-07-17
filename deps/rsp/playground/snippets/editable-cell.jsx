<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror; text reuses table-view.jsx's first cell value for consistency
     with cell.jsx.

     Gotcha: EditableCell's own prop data marks `renderEditing` required —
     `() => ReactNode`, i.e. a function. This fragment format only carries
     string XML attribute values (see resolveRspPropKey / buildRspSnippet),
     so a function prop simply cannot be authored here at all, required or
     not — it's omitted. This should only matter once a user actually
     triggers edit mode (which this static preview never does), not for the
     plain read display shown here.

     EditableCell is normally used only nested inside <Row>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM rather than a crash — though
     the missing required `renderEditing` makes this one worth double-
     checking live. -->
<EditableCell>Budget.xlsx</EditableCell>
