<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component, so there's no SWC shape to
     mirror (there's also no SWC `popover` concept to compare a trigger
     handling against — SWC's overlay-adjacent controls, like tooltip's, are
     native `popover` attributes rather than a standalone component).

     deps/rsp/data/Popover.json's `children` isn't marked required, so a
     plain text child is used here (mirrors tooltip.jsx's own minimal
     content, since Popover has no documented heading/body sub-slots the way
     Dialog does).

     Popover needs a triggerRef it has none of standalone, so initRsp()/
     buildRspSnippet() wrap it in a real DialogTrigger + Button (overlay-triggers.js). -->
<Popover>Popover content goes here.</Popover>
