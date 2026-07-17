<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name —
     "Color-field" — instead of a real label. No deps/swc/playground/snippets/color-field.html
     counterpart exists yet, so there's no SWC shape to mirror.

     `label` isn't in ColorField.json's own prop list (size/prefix/channel/
     colorSpace/placeholder/styles) nor in ColorFieldProps/InputProps in
     rsp-base-props.json — same gap already documented in date-field.jsx for
     DateField's `label`, inherited from the shared `LabelableProps` interface
     that this repo's extraction doesn't walk into for this component either.

     No value/defaultValue is given: ColorField is a text-entry field (like
     TextField), and renders fine uncontrolled with an empty input — neither
     its own JSON nor ColorFieldProps/ColorFieldRenderProps in
     rsp-base-props.json document a value as required. -->
<ColorField label="Color" />
