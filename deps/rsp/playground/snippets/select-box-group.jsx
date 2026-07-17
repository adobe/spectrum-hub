<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No
     deps/swc/playground/snippets/select-box-group.html counterpart exists yet, so there's no
     SWC shape to mirror — this is a fresh three-item default.

     SelectBoxGroup.json documents its `children` prop's description as "The
     SelectBox elements contained within the SelectBoxGroup" — that's the
     only place in this repo's extracted data that names the item tag, since
     there's no separate SelectBox.json or SelectBoxProps entry in
     rsp-base-props.json at all. SelectBox's own props (what it accepts
     besides an `id`, whether it needs a `value`, whether its label/
     illustration need a special slotted sub-component the way CardView's
     Card needs CardPreview) are completely undocumented in this repo's data
     — this file is the least-verified of this batch and should be
     double-checked live.

     `aria-label` on the group is added by analogy with CardView, which is
     built on the same underlying GridList/ListBoxProps collection
     (SelectBoxGroup extends ListBoxProps per components.json) and throws an
     accessible-name error without one (see card-view.jsx) — not confirmed
     live for SelectBoxGroup specifically. Each SelectBox is given only an
     `id` (mirroring Card's `id` in card-view.jsx) and plain text content
     rather than a guessed `Text slot="label"` sub-structure, following the
     same conservative choice illustrated-message.jsx makes elsewhere in this
     directory: plain text over an unverified sub-component API. -->
<SelectBoxGroup aria-label="Choose a plan" selectionMode="single">
  <SelectBox id="starter">Starter</SelectBox>
  <SelectBox id="pro">Pro</SelectBox>
  <SelectBox id="enterprise">Enterprise</SelectBox>
</SelectBoxGroup>
