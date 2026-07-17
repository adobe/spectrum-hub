<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/accordion.html's two-item shape. -->
<Accordion>
  <AccordionItem id="one">
    <AccordionItemTitle>Section one</AccordionItemTitle>
    <AccordionItemPanel>Content for section one.</AccordionItemPanel>
  </AccordionItem>
  <AccordionItem id="two">
    <AccordionItemTitle>Section two</AccordionItemTitle>
    <AccordionItemPanel>Content for section two.</AccordionItemPanel>
  </AccordionItem>
</Accordion>
