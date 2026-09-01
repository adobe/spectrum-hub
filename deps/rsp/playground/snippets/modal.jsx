<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `Modal`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     s2 consumers are expected to reach for Dialog/DialogTrigger instead. The shape
     below is react-aria-components' own standalone-Modal example, kept because the
     prop table documents the same isOpen/defaultOpen/onOpenChange trio. -->
<Modal isOpen="">
  <Dialog>
    <Heading>Confirm changes</Heading>
    <Content>Are you sure you want to save these changes?</Content>
  </Dialog>
</Modal>
