<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror. Reuses the same Card+CardPreview shape documented in
     card-view.jsx (a bare text child of CardPreview, not a sibling of it —
     see that file for the mixed text/element gotcha this avoids).

     STANDALONE CAVEAT: Card is a collection sub-item — normally only used
     nested inside a CardView (a GridList; see card-view.jsx), which supplies
     the actual grid layout, selection, and list semantics. Loaded directly
     via ?component=card&implementation=rsp with no CardView wrapper, it's
     expected to degrade gracefully the same way AccordionItem does standalone
     (verified live for AccordionItem, not independently re-verified for Card
     itself): real DOM renders as a plain, under-chromed element rather than
     crashing. Flagging for a live double-check. -->
<Card id="budget">
  <CardPreview>Budget.xlsx</CardPreview>
</Card>
