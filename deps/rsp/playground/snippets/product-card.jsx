<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror. ProductCard.json exposes only the same props Card.json does
     (children/size/density/variant, all `inheritedFrom: "CardProps"`) — no
     product-specific slots (thumbnail/price/etc.) show up in the extracted
     data, so this fragment reuses the exact Card+CardPreview shape from
     card.jsx/card-view.jsx rather than inventing an untested subcomponent
     composition.

     GENUINELY UNSURE: ProductCard is documented as a ready-made Card preset
     meant to be used directly (unlike the plain Card, which normally needs a
     CardView parent), so it's expected to be fine fully standalone. But
     whether real usage composes something richer inside it (e.g. an Image
     preview plus a price/title Text) isn't confirmed by this component's own
     JSON — flagging for a live double-check against the real component. -->
<ProductCard id="wireless-headphones">
  <CardPreview>Wireless Headphones</CardPreview>
</ProductCard>
