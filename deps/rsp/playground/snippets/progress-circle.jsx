<!-- Dev-authored, for the code disclosure AND the live RSP preview (initRsp()
     in deps/rsp/playground/index.html reads this same fragment) — RSP has no preview
     markup file of its own to source this from, since it renders via
     React.createElement rather than an HTML string. This is a leaf component
     (no children/label prop at all); `aria-label` isn't in ProgressCircle's
     own extracted prop data (inherited from AriaLabelingProps, not walked by
     this repo's extraction) but is needed for an accessible name, mirroring
     deps/swc/playground/snippets/progress-circle.html's `label` attribute (RSP has no
     `label` prop here — only the ARIA one). -->
<ProgressCircle aria-label="Loading" isIndeterminate="" />
