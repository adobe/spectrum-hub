<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component;
     the generic fallback (`{ children: 'Status-light' }`) would mangle the
     hyphenated name AND miss the variant, so this mirrors
     deps/swc/playground/snippets/status-light.html's variant and label exactly. -->
<StatusLight variant="positive">Available</StatusLight>
