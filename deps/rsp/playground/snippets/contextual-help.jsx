<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror.

     UNLIKE every other component in this batch, ContextualHelp is NOT
     subject to the blank-preview limitation. Confirmed by checking the
     published ContextualHelp.d.ts directly: `ContextualHelp` forwards its
     ref to `FocusableRefValue<HTMLButtonElement>` — it renders its OWN
     trigger button internally (an ActionButton + Popover it manages itself)
     rather than depending on an external DialogTrigger/MenuTrigger-style
     wrapper for open/anchor state the way Dialog/Menu/Popover/Tooltip do.
     Its doc comment says exactly this: "Contextual help shows a user extra
     information about the state of an adjacent component". So this is
     authored as a normal working leaf/composite, no caveat needed — expect
     this one to actually render live.

     deps/rsp/data/ContextualHelp.json marks `children` as required; the
     published .d.ts further notes the real ContextualHelpPopover "Supports
     Heading, Content, and Footer elements" — the same `Heading`/`Content`
     real @react-spectrum/s2 exports used in dialog.jsx (confirmed via
     Content.d.ts, excluded from this repo's catalog only because
     discover-components.js's SKIP_FILES skips their shared source file, not
     because they aren't real). -->
<ContextualHelp>
  <Heading>Why do I see this?</Heading>
  <Content>This setting only applies to your current workspace.</Content>
</ContextualHelp>
