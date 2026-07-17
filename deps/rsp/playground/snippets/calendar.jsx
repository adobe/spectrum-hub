<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no real subcomponent structure), so the ONLY reason this file exists is
     to fix the label: without it, initRsp()'s generic fallback capitalizes
     just the first letter of the whole hyphenated component name — "Calendar"
     (already fine standalone, but this still gives it a real accessible
     name). No deps/swc/playground/snippets/calendar.html counterpart exists yet, so there's no
     SWC shape to mirror.

     Unlike the text/date/time fields above, Calendar.json has no `label`
     prop (nor does the shared `LabelableProps` interface show up for it) —
     Calendar isn't a labelable form field, it's a grid widget, so it needs an
     `aria-label` instead, like RadioGroup/CheckboxGroup/TagGroup elsewhere in
     this directory. No children or value/defaultValue are required — neither
     Calendar.json nor the shared `CalendarProps`/`CalendarRenderProps`
     entries in rsp-base-props.json document either as required, and an
     uncontrolled Calendar renders fine showing the current month. -->
<Calendar aria-label="Appointment date" />
