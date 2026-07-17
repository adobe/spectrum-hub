<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component;
     `value` isn't in Meter's own extracted prop data (inherited from a base
     progress-bar interface this repo's extraction doesn't walk into) but is
     required for the meter to show any fill at all. Mirrors
     deps/swc/playground/snippets/meter.html's value and label. -->
<Meter value="60" label="Storage used" />
