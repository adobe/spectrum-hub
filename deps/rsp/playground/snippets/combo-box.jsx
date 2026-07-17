<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No
     deps/swc/playground/snippets/combo-box.html counterpart exists yet, so there's no SWC shape to mirror
     — this is a fresh four-item default.

     `label` isn't in ComboBox.json's own prop list — same as TextField, it's
     inherited from the shared `LabelableProps` interface in
     rsp-base-props.json (`label: ReactNode`). `children` IS documented as
     required directly on ComboBox.json ("The contents of the collection"),
     same as TagGroup, so real item children are included rather than a bare
     placeholder.

     UNCERTAIN item tag name: neither ComboBox.json nor rsp-base-props.json
     has a `ComboBoxItemProps`/`ComboBoxItem`-named entry the way TagGroup's
     children (`Tag`) or SegmentedControl's children (`SegmentedControlItem`)
     do — there's no matching deps/rsp/data/ComboBoxItem.json either. The
     closest documented shapes are the generic `ItemProps` (legacy
     react-stately `Item`) and `ListBoxItemProps` (react-aria-components
     `ListBoxItem`), and ComboBox.json's own `layout`/`orientation`/
     `selectionBehavior` entries are all explicitly `inheritedFrom:
     "ListBoxProps"`, suggesting ComboBox composes a ListBox internally. This
     fragment guesses `ComboBoxItem` — matching @react-spectrum/s2's naming
     convention of giving each collection component its own dedicated item
     export (PickerItem, SegmentedControlItem, TreeViewItem, ...) — but this
     is a guess and should be verified live; `ListBoxItem` is the fallback
     candidate if `ComboBoxItem` turns out not to be a real export. -->
<ComboBox label="Ice cream flavor">
  <ComboBoxItem>Chocolate</ComboBoxItem>
  <ComboBoxItem>Mint</ComboBoxItem>
  <ComboBoxItem>Strawberry</ComboBoxItem>
  <ComboBoxItem>Vanilla</ComboBoxItem>
</ComboBox>
