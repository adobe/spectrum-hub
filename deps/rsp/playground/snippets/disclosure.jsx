<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh single-panel default.

     Unlike Accordion (many items, each independently expandable), Disclosure
     is a single expand/collapse unit — its own extracted prop data marks
     `children` required and describes it as "a DisclosureTitle and
     DisclosurePanel", i.e. exactly this two-part shape. -->
<Disclosure>
  <DisclosureTitle>Advanced settings</DisclosureTitle>
  <DisclosurePanel>Additional configuration options go here.</DisclosurePanel>
</Disclosure>
