<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     `children` is marked required in InlineAlert's own extracted prop data,
     and its own stories confirm the expected shape: a Heading plus Content
     (both real top-level @react-spectrum/s2 exports, same pair used
     elsewhere in the package), not bare text. `variant` defaults to
     'neutral'; 'negative' is used here to preview a realistic error-style
     default rather than the plainest possible variant. -->
<InlineAlert variant="negative">
  <Heading>Payment information</Heading>
  <Content>There was an error processing your payment. Please check that your card information is correct, then try again.</Content>
</InlineAlert>
