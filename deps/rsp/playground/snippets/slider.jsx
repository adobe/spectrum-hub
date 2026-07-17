<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label. No deps/swc/playground/snippets/slider.html counterpart exists yet, so
     there's no SWC shape to mirror.

     `label` isn't in Slider.json's own prop list (children/size/isEmphasized/
     trackStyle/thumbStyle/fillOffset, all `inheritedFrom: SliderBaseProps`)
     — and `SliderBaseProps` itself has no entry at all in
     rsp-base-props.json, so this repo's extracted data has no record of
     `label` for Slider anywhere. Unlike the color pickers/wheel above, a
     Slider is a text-labeled control (it shows the label and current value
     as real text next to the track, not just an icon), so `label` rather
     than `aria-label` is used here, same as the task's own framing of this
     control.

     `defaultValue` also isn't documented anywhere for Slider (same
     `SliderBaseProps` gap), but unlike the color controls, Slider isn't
     required to have one — react-aria's underlying slider state defaults an
     uncontrolled value to `minValue` (0 unless overridden) on its own.
     `defaultValue="50"` is supplied anyway purely so the preview shows a
     thumb mid-track rather than pinned to one edge; numeric-looking string
     attributes are already used this way elsewhere (see meter.jsx's
     `value="60"`). -->
<Slider label="Opacity" defaultValue="50" />
