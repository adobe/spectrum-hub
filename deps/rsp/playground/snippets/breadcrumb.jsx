<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     STANDALONE CAVEAT: Breadcrumb is a collection sub-item — normally only
     used nested inside Breadcrumbs (see breadcrumbs.jsx), which supplies the
     separator chrome and navigation list semantics. Loaded directly via
     ?component=breadcrumb&implementation=rsp with no Breadcrumbs wrapper,
     it's expected to degrade gracefully the same way AccordionItem does
     standalone (verified live for AccordionItem, not independently
     re-verified for Breadcrumb itself): real DOM renders as a plain,
     under-chromed element rather than crashing. Flagging for a live
     double-check. -->
<Breadcrumb>Home</Breadcrumb>
