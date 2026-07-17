<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. There is no plain "Asset"
     @react-spectrum/s2 export — AssetCard is the real one.
     deps/swc/playground/snippets/asset.html DOES exist (`<swc-asset variant="file" label="Document.pdf">`)
     but it's a DIFFERENT, non-matching SWC route — not this component's
     counterpart — so there's nothing to mirror here. AssetCard.json exposes
     only the same props Card.json does (children/size/density/variant, all
     `inheritedFrom: "CardProps"`) — no asset-specific slots (thumbnail/file
     type icon/etc.) show up in the extracted data, so this fragment reuses
     the exact Card+CardPreview shape from card.jsx/card-view.jsx rather than
     inventing an untested subcomponent composition.

     GENUINELY UNSURE: AssetCard is documented as a ready-made Card preset
     meant to be used directly (unlike the plain Card, which normally needs a
     CardView parent), so it's expected to be fine fully standalone. But
     whether real usage composes something richer inside it (e.g. a file-type
     thumbnail/icon preview) isn't confirmed by this component's own JSON —
     flagging for a live double-check against the real component. -->
<AssetCard id="budget-xlsx">
  <CardPreview>Budget.xlsx</CardPreview>
</AssetCard>
