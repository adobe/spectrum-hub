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

     FIXED (2026-07-31): real Dialog is always a child of a DialogTrigger +
     Modal/Popover pair that supplies open/anchor state via context; rendered
     standalone the way every other component renders, it used to mount
     nothing at all — no DOM, no error. initRsp() and buildRspSnippet() now
     wrap this fragment in a real `<DialogTrigger><Button>...</Button>
     <Dialog>...</Dialog></DialogTrigger>` per overlay-triggers.js's `dialog`
     entry — confirmed live: clicking the trigger opens a real "Enable
     notifications" modal. -->
<Dialog>
  <Heading>Enable notifications</Heading>
  <Content>You can turn this off anytime in Settings.</Content>
</Dialog>
