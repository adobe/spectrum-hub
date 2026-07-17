<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror.

     `color` isn't in ColorSwatch's own extracted prop data (ColorSwatch.json
     only lists size/rounding/styles) — it's inherited from react-aria-
     components' base render props, confirmed via rsp-base-props.json's
     "ColorSwatchRenderProps" entry (`color: Color`, required) — but is
     required at render time; a hex string is accepted directly, no Color
     object construction needed. Same gotcha already documented in
     color-swatch-picker.jsx for ColorSwatch nested in a ColorSwatchPicker;
     this file is the bare standalone case instead.

     GENUINELY UNSURE: this batch's instructions group ColorSwatch with the
     collection sub-items above (Tag, Breadcrumb, Card, etc.) for a standalone
     degradation caveat, but functionally ColorSwatch isn't a list/collection
     item like those — it's a plain swatch, not something that needs a
     GridList-like parent for its accessible semantics (color-swatch-
     picker.jsx's ColorSwatchPicker parent is a grouping/layout convenience,
     not a required ARIA relationship the way TagGroup is for Tag). Expect
     this to render fine bare, but that's not independently live-verified for
     the no-picker-parent case — flagging for a live double-check. -->
<ColorSwatch color="#7B61FF" />
