<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label and give it a working color. No
     deps/swc/playground/snippets/color-wheel.html counterpart exists yet, so there's no SWC
     shape to mirror.

     ColorWheel.json documents only `size` (default 192) and `styles` — no
     `label`. Like ColorArea, it's a visual widget rather than a labelable
     form field, so an `aria-label` is used instead, by analogy with
     Calendar/ColorArea elsewhere in this directory (not confirmed live to
     be strictly required).

     `defaultValue` isn't documented in ColorWheel.json or ColorWheelProps in
     rsp-base-props.json, but same as ColorArea/ColorSlider, a color wheel has
     no sensible default color to render a thumb position for — this is the
     same undocumented-but-required situation as ColorSwatch's `color` (see
     color-swatch-picker.jsx). A hex string is accepted directly. -->
<ColorWheel aria-label="Color" defaultValue="#7B61FF" />
