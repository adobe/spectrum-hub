<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component (disclosure.jsx's own comment
     notes no deps/swc/playground/snippets/disclosure.html exists either), so the text here
     just reuses disclosure.jsx's own panel text for consistency.

     A leaf component: its own prop data marks `children` required (ReactNode,
     no default/description given) and `role` optional (defaults to 'group').

     DisclosurePanel is normally used only nested inside <Disclosure>. Loaded
     standalone, assume the same graceful-degradation behavior verified live
     for AccordionItem: some real, unstyled DOM rather than a crash. -->
<DisclosurePanel>Additional configuration options go here.</DisclosurePanel>
