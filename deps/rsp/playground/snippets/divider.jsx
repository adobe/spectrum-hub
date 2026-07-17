<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     with no children/label prop at all, so this file exists only to
     establish the fragment's own attributes as seeded defaults (see
     deps/rsp/playground/index.html's initRsp comment on `currentProps`) — currently
     none are needed beyond the default horizontal/M styling, unlike
     deps/swc/playground/snippets/divider.html's SWC counterpart, which needs an explicit
     inline-size because that implementation has no intrinsic length; RSP's
     Divider renders full-width by default and doesn't share that gotcha. -->
<Divider />
