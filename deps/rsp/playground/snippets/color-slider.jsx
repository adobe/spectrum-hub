<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label and give it a working channel/color. No
     deps/swc/playground/snippets/color-slider.html counterpart exists yet, so there's no SWC
     shape to mirror.

     ColorSlider.json documents `label` directly, so that's a real authored
     prop here (status: alpha). `channel` is documented too, and is required —
     unlike ColorArea's xChannel/yChannel it is not inferred, so omitting it
     renders an empty node.

     A channel is only valid in some color spaces, which is why `alpha` is
     used. Measured across the full cross-product on the live preview:

       rgb  red, green, blue, alpha
       hsl  hue, saturation, lightness, alpha
       hsb  hue, saturation, brightness, alpha

     `alpha` is the only one valid in all three, so it stays working whatever
     colorSpace is set to — hence it is also the control's default
     (DEFAULT_OVERRIDES in blocks/playground/playground-data.js). Every other
     pairing outside that table renders nothing, with no error. -->
<ColorSlider label="Red opacity" channel="alpha" defaultValue="#f00" />
