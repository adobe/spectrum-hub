<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label and give it a usable default color. No
     deps/swc/playground/snippets/color-area.html counterpart exists yet, so there's no SWC
     shape to mirror.

     ColorArea.json documents nothing but `styles` (status: alpha), and
     ColorAreaProps in rsp-base-props.json only adds `className` — no
     `defaultValue` shows up anywhere in this repo's extracted data. Same as
     ColorSwatch's undocumented-but-required `color` (see
     color-swatch-picker.jsx), ColorArea is a 2D color picker with no sensible
     built-in default color, so a `defaultValue` is required at render time —
     a hex string is accepted directly. `xChannel`/`yChannel` are left
     unset rather than guessed: neither is documented here, and ColorArea is
     expected to derive sensible default channels from the value's color
     space on its own, but that inference isn't verified live — worth
     double-checking the rendered axes match a real ColorArea if this looks
     off.

     ColorArea has no `label`/`aria-label` documented anywhere either (it's a
     visual widget, not a labelable field, similar to Calendar/ColorWheel) —
     an `aria-label` is added here by that same analogy, though this hasn't
     been confirmed to actually be required at render time. -->
<ColorArea aria-label="Color" defaultValue="#7B61FF" />
