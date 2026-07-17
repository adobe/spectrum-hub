<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh default.

     This is a leaf component with no hyphen in its name, so initRsp()'s
     generic fallback (`{ children: 'Switch' }`) would already produce a
     technically valid label — this fragment exists only to swap that
     placeholder for a real example label (children work here exactly like a
     checkbox's label), matching @react-spectrum/s2's own Switch story
     default. -->
<Switch>Wi-Fi</Switch>
