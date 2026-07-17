<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror. CollectionCardPreview.json only documents `children` (required) —
     the same thin shape as CardPreview.json; presumed to be CardPreview's
     variant for a Card that represents a collection/folder of items rather
     than a single asset, though that's inferred from the name, not confirmed
     from any richer prop data.

     STANDALONE CAVEAT: like CardPreview, this is a collection sub-item —
     normally only used nested inside a Card. Loaded directly via
     ?component=collection-card-preview&implementation=rsp with no Card
     wrapper, it's expected to degrade gracefully the same way AccordionItem
     does standalone (verified live for AccordionItem, not independently
     re-verified for CollectionCardPreview itself): real DOM renders as a
     plain, under-chromed element rather than crashing. Flagging for a live
     double-check. -->
<CollectionCardPreview>Recent Files</CollectionCardPreview>
