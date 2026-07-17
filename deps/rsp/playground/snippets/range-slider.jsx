<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label. No deps/swc/playground/snippets/range-slider.html counterpart exists
     yet, so there's no SWC shape to mirror.

     RangeSlider.json's own prop list only documents `startName`/`endName`/
     `form` (HTML form-submission plumbing) — no `label`. RangeSlider isn't
     even listed with an `includes: ["SliderBaseProps"]` in components.json
     the way Slider is, so there's less extracted data here than for Slider,
     but it's the same dual-thumb control family and shows real label text
     next to its track — `label` is supplied here for the same reason
     slider.jsx supplies one for Slider.

     No value/defaultValue is given: RangeSlider's value is a RangeValue
     (`{ start, end }`, per the shared `RangeValue` interface in
     rsp-base-props.json), not a plain number — that shape can't be expressed
     as a plain XML attribute string in this fragment format. This is left to
     the component's own uncontrolled default; unlike RangeCalendar/
     DateRangePicker's uncontrolled behavior (both verified by an existing
     precedent in this directory), an uncontrolled RangeSlider's actual
     default thumb positions haven't been confirmed live — worth
     double-checking this renders two usable thumbs rather than a degenerate
     zero-width range. -->
<RangeSlider label="Price range" />
