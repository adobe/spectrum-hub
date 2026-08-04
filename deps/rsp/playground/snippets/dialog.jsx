<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     deps/rsp/data/Dialog.json's `children` prop has no dedicated
     heading/body sub-slots of its own — but the published
     @react-spectrum/s2 types (Content.d.ts, fetched directly from unpkg to
     confirm) show `Heading` and `Content` ARE real top-level s2 exports
     (alongside Header/Text/Keyboard/Footer), just excluded from this repo's
     component catalog by discover-components.js's SKIP_FILES list — they
     live in a shared file with no single matching default export, not
     because they aren't real components. Used here for a heading + body
     text pair, same as Dialog's real documented usage.

     Dialog has no standalone open state, so initRsp()/buildRspSnippet() wrap
     it in a real DialogTrigger + Button (overlay-triggers.js). -->
<Dialog>
  <Heading>Enable notifications</Heading>
  <Content>You can turn this off anytime in Settings.</Content>
</Dialog>
