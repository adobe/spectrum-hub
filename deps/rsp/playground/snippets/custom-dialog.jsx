<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     deps/rsp/data/CustomDialog.json doesn't mark `children` as required, but
     the published CustomDialog.d.ts shows it extends react-aria-components'
     DialogProps the same way Dialog does — a floating window with a custom
     layout, still fundamentally dialog content. `Heading`/`Content` are real
     @react-spectrum/s2 exports (confirmed via Content.d.ts — see standard-dialog.jsx
     for the full explanation of why they have no catalog entry of their
     own), used here the same way as standard-dialog.jsx's default content.

     CustomDialog has no standalone open state, so initRsp()/buildRspSnippet()
     wrap it in a real DialogTrigger + Button (overlay-triggers.js). -->
<CustomDialog>
  <Heading>Share this file</Heading>
  <Content>Anyone with the link will be able to view this file.</Content>
</CustomDialog>
