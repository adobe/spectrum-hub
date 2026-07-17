<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     AccordionItemHeader's own prop data only documents a required `children`
     (ReactNode), described plainly as "the contents of the accordion item
     header." @react-spectrum/s2's real Accordion doesn't require this
     wrapper at all — accordion.jsx's existing composite nests
     AccordionItemTitle directly inside AccordionItem, which is the more
     common shape. AccordionItemHeader exists as an optional wrapper for when
     an item's header needs more than just the title (e.g. an action button
     alongside it); modeled here with just its title child since no other
     prop is documented to safely add.

     AccordionItemHeader is normally used only nested inside AccordionItem,
     itself inside <Accordion>. Loaded standalone (as this playground route
     does), assume the same graceful-degradation behavior verified live for
     AccordionItem: some real, unstyled/uninteractive DOM rather than a crash. -->
<AccordionItemHeader>
  <AccordionItemTitle>Section title</AccordionItemTitle>
</AccordionItemHeader>
