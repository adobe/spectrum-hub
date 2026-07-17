<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. deps/swc/playground/snippets/accordion-item.html
     exists (a swc-accordion-item with label "Accordion item" and text "Item
     content goes here."); mirrored here as the title/panel text so SWC and
     RSP show comparable content.

     AccordionItem's own prop data marks `children` required, described as
     "consisting of a accordion item title and accordion item panel" — the
     same two-part shape accordion.jsx's per-item structure already uses, no
     AccordionItemHeader wrapper needed (that's a separate, optional
     component for when a header needs more than just the title — see
     accordion-item-header.jsx). isExpanded/isFocusVisibleWithin/isDisabled/
     state are listed as required in AccordionItem's prop data, but they're
     tagged `inheritedFrom: AccordionItemRenderProps` — render-prop values the
     component computes and hands to a `children` render function, not
     attributes an author sets — so they're intentionally omitted here.

     AccordionItem is normally used only nested inside <Accordion>. Loaded
     standalone (as this playground route does), react-aria-components-based
     collection items typically degrade gracefully rather than crash: this
     was verified live for AccordionItem specifically — it rendered as a
     plain bordered text row, no accordion chrome (no expand/collapse
     interaction), no error. -->
<AccordionItem id="item">
  <AccordionItemTitle>Accordion item</AccordionItemTitle>
  <AccordionItemPanel>Item content goes here.</AccordionItemPanel>
</AccordionItem>
