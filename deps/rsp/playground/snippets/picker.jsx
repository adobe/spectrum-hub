<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No
     deps/swc/playground/snippets/picker.html counterpart exists yet, so there's no SWC shape to mirror —
     this is a fresh four-item default.

     `label` isn't in Picker.json's own prop list — same as TextField, it's
     inherited from the shared `LabelableProps` interface in
     rsp-base-props.json (`label: ReactNode`). `children` IS documented as
     required directly on Picker.json ("The contents of the collection"),
     same as TagGroup, so real item children are included rather than a bare
     placeholder.

     UNCERTAIN item tag name: same situation as combo-box.jsx — neither
     Picker.json nor rsp-base-props.json has a `PickerItemProps`/`PickerItem`
     entry, and there's no deps/rsp/data/PickerItem.json. Picker.json's own
     `layout`/`orientation`/`selectionBehavior` entries are all explicitly
     `inheritedFrom: "ListBoxProps"`, again suggesting an internal ListBox.
     This fragment guesses `PickerItem`, following @react-spectrum/s2's
     per-component item-export convention (SegmentedControlItem,
     TreeViewItem, ...) and the same guess made in combo-box.jsx for
     `ComboBoxItem` — but this is unverified and should be checked live;
     `ListBoxItem` is the fallback candidate if `PickerItem` isn't real. -->
<Picker label="Ice cream flavor">
  <PickerItem>Chocolate</PickerItem>
  <PickerItem>Mint</PickerItem>
  <PickerItem>Strawberry</PickerItem>
  <PickerItem>Vanilla</PickerItem>
</Picker>
