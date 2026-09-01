<!-- Dev-authored, for the code disclosure. NO LIVE PREVIEW: `@react-spectrum/s2`
     publishes no runtime export named `TextFieldBase`, so the block shows a note in the
     preview's place — see deps/rsp/playground/unreachable-exports.js for the routes
     that were checked and why every import path is closed. The types ship, which is
     why this component still has a prop table.

     The internal base that TextField/TextArea/SearchField/NumberField compose their
     field chrome from, which is why its prop list is near-identical to TextField's
     and why it is not exported. `label` is inherited from LabelableProps. -->
<TextFieldBase label="Text" />
