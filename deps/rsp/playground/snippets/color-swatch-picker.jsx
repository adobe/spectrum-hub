<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in static-html/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No static-html/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-swatch default.

     `color` isn't in ColorSwatch's extracted prop data (it's inherited from
     react-aria-components' base ColorSwatchProps, which this repo's
     extraction doesn't walk into) but is required at render time — a hex
     string is accepted directly, no Color object construction needed. -->
<ColorSwatchPicker>
  <ColorSwatch color="#7B61FF" />
  <ColorSwatch color="#2D9CDB" />
  <ColorSwatch color="#27AE60" />
</ColorSwatchPicker>
