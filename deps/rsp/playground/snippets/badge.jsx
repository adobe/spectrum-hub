<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in static-html/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component;
     the generic fallback (`{ children: 'Badge' }`) would actually render fine
     here, but this fragment matches static-html/badge.html's default text
     instead of the generic component-name placeholder. -->
<Badge>New</Badge>
