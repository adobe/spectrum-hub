<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name —
     "Range-calendar" — instead of a real accessible name. No
     deps/swc/playground/snippets/range-calendar.html counterpart exists yet, so there's no SWC
     shape to mirror.

     Like calendar.jsx's plain Calendar, RangeCalendar.json has no `label`
     prop (nor does the shared `LabelableProps` interface show up for it) —
     it's a grid widget, not a labelable form field, so it needs an
     `aria-label` instead, matching Calendar/RadioGroup/CheckboxGroup/TagGroup
     elsewhere in this directory.

     No value/defaultValue is given: RangeCalendar's value is a RangeValue
     (`{ start, end }`) of DateValue objects, which can't be expressed as a
     plain XML attribute string in this fragment format. Neither
     RangeCalendar.json nor the shared RangeCalendarProps/RangeCalendarRenderProps
     entries in rsp-base-props.json document a value as required, and — by
     the same reasoning calendar.jsx already relies on for the plain
     Calendar — an uncontrolled RangeCalendar should render fine showing the
     current month with no selected range. -->
<RangeCalendar aria-label="Appointment range" />
