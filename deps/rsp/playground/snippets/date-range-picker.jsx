<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name —
     "Date-range-picker" — instead of a real label. No
     deps/swc/playground/snippets/date-range-picker.html counterpart exists yet, so there's no
     SWC shape to mirror.

     `label` isn't in DateRangePicker.json's own prop list (only
     size/maxVisibleMonths/popover-related props) nor in DateRangePickerProps
     in rsp-base-props.json — same extraction gap already documented in
     date-field.jsx for DateField's `label`, inherited from the shared
     `LabelableProps` interface (`label: ReactNode`) that isn't walked into
     for this component either.

     No value/defaultValue is given: DateRangePicker's value is a RangeValue
     (`{ start, end }`, per the shared `RangeValue` interface in
     rsp-base-props.json) of DateValue objects, not a plain string — there's
     no way to express that shape as a plain XML attribute string in this
     fragment format, so it's left uncontrolled. DateRangePicker renders fine
     this way, showing two empty date-segment groups, same as DateField does
     for a single date. -->
<DateRangePicker label="Date range" />
