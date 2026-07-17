<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-card default.

     aria-label is required here: like Tabs, react-aria's underlying CardView
     (a GridList) throws an accessible-name error at render time without an
     aria-label or aria-labelledby. Each Card's own children are exactly one
     CardPreview element, not CardPreview-plus-sibling-text: buildCompositeElement
     (deps/rsp/playground/index.html) walks a fragment node's Element children only
     (`[...node.children]`), so a bare text node next to CardPreview would be
     silently dropped rather than rendered — found via a live browser
     reproduction where the filename text never appeared in the DOM at all,
     no error. Putting the filename inside CardPreview itself sidesteps that. -->
<CardView aria-label="Recent files">
  <Card id="budget">
    <CardPreview>Budget.xlsx</CardPreview>
  </Card>
  <Card id="roadmap">
    <CardPreview>Roadmap.pdf</CardPreview>
  </Card>
</CardView>
