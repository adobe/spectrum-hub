<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label. No deps/swc/playground/snippets/radio.html counterpart exists yet, so
     there's no SWC shape to mirror.

     This is a STANDALONE Radio, not one nested in a RadioGroup (see
     radio-group.jsx for that composite case, including the `value`-isn't-
     in-extracted-prop-data gotcha for Radio's children there). Radio.json
     documents `children` directly ("The label for the element"), same as
     Checkbox.json — see checkbox.jsx — so plain text content is used as the
     label here, no `aria-label` needed. No `value` prop is given either, for
     the same reason checkbox.jsx omits one on a standalone Checkbox: `value`
     only matters for tracking selection within a group's shared state, and
     there's no group here.

     Confirmed via a live browser reproduction: unlike standalone Checkbox
     (which renders its normal checked/unchecked control fine, verified in
     checkbox.jsx) and unlike AccordionItem (which degrades to plain
     unstyled text), a standalone Radio renders NOTHING at all — no DOM, no
     console error — because its underlying react-aria implementation reads
     required selection/grouping state from RadioGroup's context, and simply
     produces no output when that context is absent. This component can only
     be usefully previewed nested inside radio-group.jsx's composite. -->
<Radio>Option</Radio>
