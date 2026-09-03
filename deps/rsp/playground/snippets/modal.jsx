<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to mirror.

     deps/rsp/data/Modal.json doesn't list `isOpen` (only size/isEntering/
     isExiting/UNSTABLE_portalContainer survive this repo's extraction), but
     the published Modal.d.ts shows RSP's Modal re-exports react-aria-
     components' Modal directly, whose ModalOverlayProps extends react-
     stately's OverlayTriggerProps — the same isOpen/defaultOpen/
     onOpenChange trio a DialogTrigger would otherwise manage. Unlike Dialog/
     Menu/Popover/etc., Modal's real docs show it CAN be used standalone with
     isOpen passed directly, no wrapping Trigger required — so `isOpen=""` is
     set here (initRsp()'s attribute-to-prop mapping treats an empty-string
     boolean attribute as `true`) with a nested Dialog as its content, the
     same shape react-aria-components' own standalone-Modal example uses.

     CONFIRMED via a live browser reproduction: this fails for a completely
     different reason than expected. `@react-spectrum/s2` has no `Modal`
     export at all — esm.sh's bundle request 404s ("Failed to fetch
     dynamically imported module... exports=Modal,..."), the same broken-
     export category as icon.jsx/asset (Icon/Asset aren't real s2 exports
     either). The isOpen/Dialog structure above may well be exactly correct
     for react-aria-components' own bare `Modal`, but s2 apparently doesn't
     re-export that name at all — s2 consumers are expected to reach for
     Dialog/DialogTrigger instead. This route can never render regardless of
     what this fragment contains. -->
<Modal isOpen="">
  <Dialog>
    <Heading>Confirm changes</Heading>
    <Content>Are you sure you want to save these changes?</Content>
  </Dialog>
</Modal>
