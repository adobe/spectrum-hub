<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name —
     "Date-picker" — instead of a real label. No deps/swc/playground/snippets/date-picker.html
     counterpart exists yet, so there's no SWC shape to mirror.

     `label` isn't in DatePicker.json's own prop list (which only documents
     size/maxVisibleMonths/popover-related props) nor in DatePickerProps in
     rsp-base-props.json — same gap already documented in date-field.jsx for
     DateField's `label`, inherited from the shared `LabelableProps` interface
     (`label: ReactNode`) that this repo's extraction doesn't walk into for
     this component.

     No value/defaultValue is given: DatePicker's value is a single DateValue
     (a CalendarDate-like object from @internationalized/date), not a plain
     string, so it can't be expressed as an XML attribute the way this
     fragment format requires. DatePicker renders fine uncontrolled with empty
     date segments, same as DateField. -->
<DatePicker label="Date" />
