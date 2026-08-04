<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     with no children/label prop at all, same shape as divider.jsx.

     Real usage needs a Button that fires ToastQueue.info(...) to show
     anything, but ToastContainer has no wrapping Trigger of its own to
     author that inline the way dialog.jsx/popover.jsx/tooltip.jsx do — so
     initRsp()/buildRspSnippet() synthesize that Button as a sibling instead
     (overlay-triggers.js). -->
<ToastContainer />
