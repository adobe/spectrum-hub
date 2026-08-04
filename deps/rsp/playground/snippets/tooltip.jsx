<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. Mirrors
     deps/swc/playground/snippets/tooltip.html's text.

     Tooltip has no standalone open state, so initRsp()/buildRspSnippet() wrap
     it in a real TooltipTrigger + Button (overlay-triggers.js). -->
<Tooltip>Helpful tip text</Tooltip>
