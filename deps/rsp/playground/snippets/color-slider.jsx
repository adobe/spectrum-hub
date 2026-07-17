<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label and give it a working channel/color. No
     deps/swc/playground/snippets/color-slider.html counterpart exists yet, so there's no SWC
     shape to mirror.

     ColorSlider.json documents `label` directly, so that's a real authored
     prop here (status: alpha). `channel` isn't documented anywhere in
     ColorSlider.json or ColorSliderProps in rsp-base-props.json, but a
     ColorSlider edits exactly one channel of a color at a time and has no
     sensible default channel to fall back to — same
     undocumented-but-required situation as ColorSwatch's `color` (see
     color-swatch-picker.jsx).

     `channel="hue"` was tried first (hue being the most visually obvious
     single-channel slider) but confirmed broken via a live, harness-free
     repro: `createElement(ColorSlider, {channel: 'hue', defaultValue:
     '#7B61FF'})` renders a real DOM node with zero children — no error, no
     visible slider — while the exact same call with `channel="alpha"`
     renders correctly (matching the real @react-spectrum/s2 story example
     at stories/ColorSlider.stories.tsx, which also uses `channel: 'alpha'`
     with a hex `defaultValue`). Likely a channel/color-space mismatch: hex
     strings parse to an RGB color, and `hue` isn't a channel RGB has
     directly (needs HSL/HSB conversion first), whereas `alpha` exists on
     any color space. Using the confirmed-working `alpha` channel instead. -->
<ColorSlider label="Red opacity" channel="alpha" defaultValue="#f00" />
