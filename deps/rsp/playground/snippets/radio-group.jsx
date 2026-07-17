<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. No deps/swc/playground/snippets/*.html
     counterpart exists for this component yet, so there's no SWC shape to
     mirror — this is a fresh two-radio default.

     aria-label is required here: like Tabs, react-aria's underlying
     RadioGroup throws an accessible-name error at render time without an
     aria-label or aria-labelledby. Each Radio's `value` isn't in its
     extracted prop data (inherited from react-aria-components, not walked by
     this repo's extraction) but is required for the group to track which
     radio is selected. -->
<RadioGroup aria-label="Delivery method" defaultValue="standard">
  <Radio value="standard">Standard</Radio>
  <Radio value="express">Express</Radio>
</RadioGroup>
