<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror. NotificationBadge.json documents no `children` prop at all (only
     size/value/styles) — unlike Badge/ActionButton, this isn't a
     text-children leaf; it's a small counter, so this fragment's only job is
     to supply a real `value` so the preview shows an actual number instead of
     an empty/default badge. `value` is passed as the literal string "5"
     (fragment attributes are never cast to other types — see
     build-composite-element.js — same string-for-a-numeric-prop convention
     already used for Meter's `value` in meter.jsx).

     Like Badge/ToggleButton, NotificationBadge is expected to be fine fully
     standalone — it's a decorative counter, not a collection sub-item. -->
<NotificationBadge value="5" />
