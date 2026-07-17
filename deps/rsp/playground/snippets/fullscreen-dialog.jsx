<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     deps/rsp/data/FullscreenDialog.json's `children` prop (inherited from
     DialogProps) has no required flag, and `variant` defaults to
     'fullscreen', so it's left unset here. `Heading`/`Content` are real
     @react-spectrum/s2 exports (confirmed via Content.d.ts — see dialog.jsx
     for why they have no catalog entry of their own).

     BLANK-PREVIEW LIMITATION: expected to have the same limitation
     confirmed live for Dialog, Menu, and Tooltip (see tooltip.jsx) — like
     Dialog, FullscreenDialog extends react-aria-components' DialogProps and
     is always rendered as a DialogTrigger's child in real usage for the same
     open/anchor-state reasons. Not independently re-verified live for this
     specific component — flag for a double-check. -->
<FullscreenDialog>
  <Heading>Edit your profile</Heading>
  <Content>Update your name, photo, and preferences below.</Content>
</FullscreenDialog>
