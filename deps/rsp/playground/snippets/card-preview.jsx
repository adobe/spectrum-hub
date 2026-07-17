<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror. CardPreview.json only documents `children` (required).

     STANDALONE CAVEAT: CardPreview is a collection sub-item — normally only
     used nested inside a Card (see card-view.jsx and card.jsx), which
     supplies the actual card chrome/layout it previews within. Loaded
     directly via ?component=card-preview&implementation=rsp with no Card
     wrapper, it's expected to degrade gracefully the same way AccordionItem
     does standalone (verified live for AccordionItem, not independently
     re-verified for CardPreview itself): real DOM renders as a plain,
     under-chromed element rather than crashing. Flagging for a live
     double-check. -->
<CardPreview>Budget.xlsx</CardPreview>
