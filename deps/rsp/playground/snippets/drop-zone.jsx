<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror.

     UNLIKE the overlay/trigger components in this batch, DropZone is a
     drag-and-drop target area, not anchored to any trigger element — the
     published DropZone.d.ts shows its props are its own (styles, children,
     isFilled, replaceMessage, size), with no triggerRef/DialogTrigger-style
     dependency anywhere in its type. It renders standalone the same way any
     other leaf/composite in this shell does, so no blank-preview caveat
     applies here — expect this one to actually render live.

     deps/rsp/data/DropZone.json marks `children` required. `IllustratedMessage`
     is the real documented content shape for a DropZone's default/empty
     state; `Heading`/`Content` are real @react-spectrum/s2 exports used
     inside it (confirmed via Content.d.ts — see dialog.jsx for why they
     have no catalog entry of their own). A FileTrigger + Button pairing is
     part of DropZone's real full doc example too, but FileTrigger has no
     @react-spectrum/s2 export or extracted prop data in this repo to verify
     against, so it's left out here rather than guessing at its shape. -->
<DropZone>
  <IllustratedMessage>
    <Heading>Drag and drop your file</Heading>
    <Content>Or, select a file from your computer</Content>
  </IllustratedMessage>
</DropZone>
