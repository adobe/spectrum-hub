<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh three-item default.

     aria-label is required here: like Tabs, react-aria's underlying
     ToggleButtonGroup throws an accessible-name error at render time without
     an aria-label or aria-labelledby. -->
<ToggleButtonGroup aria-label="Text alignment">
  <ToggleButton id="left">Left</ToggleButton>
  <ToggleButton id="center">Center</ToggleButton>
  <ToggleButton id="right">Right</ToggleButton>
</ToggleButtonGroup>
