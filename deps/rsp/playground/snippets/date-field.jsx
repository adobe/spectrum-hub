<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name — "Date-
     field" — instead of a real label. No deps/swc/playground/snippets/date-field.html
     counterpart exists yet, so there's no SWC shape to mirror.

     `label` isn't in DateField.json's own prop list — same as TextField, it's
     inherited from the shared `LabelableProps` interface in
     rsp-base-props.json (`label: ReactNode`). No `value`/`defaultValue` is
     given — DateField renders fine uncontrolled with empty date segments, and
     neither DateField's own JSON nor the shared `DateFieldProps`/
     `DateFieldRenderProps` entries in rsp-base-props.json document a value as
     required. -->
<DateField label="Date" />
